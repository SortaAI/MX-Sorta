"""No dependencies: python3 -m unittest discover -s tests -p 'test_*.py'."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import collections
import json
import re
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PAGES = json.loads((ROOT / 'scripts/seo-pages.json').read_text())
BASE = 'https://mx.getsorta.io'

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.ids = []
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        self.tags.append((tag, values))
        if 'id' in values: self.ids.append(values['id'])
    def find(self, tag, **attrs):
        return [v for t, v in self.tags if t == tag and all(k in v and v[k] == a for k, a in attrs.items())]

class MexicoSEO(unittest.TestCase):
    def test_all_html_files_are_registered(self):
        files = {str(p.relative_to(ROOT)) for p in ROOT.glob('*.html')}
        files.update(str(p.relative_to(ROOT)) for folder in ['recursos', 'producto'] for p in (ROOT/folder).glob('*.html'))
        self.assertEqual(files, set(PAGES))

    def test_metadata_and_tracking_are_consistent(self):
        titles, descriptions = [], []
        for name, info in PAGES.items():
            with self.subTest(page=name):
                html = (ROOT/name).read_text(); page = Page(html)
                title = re.search(r'<title>(.*?)</title>', html)[1]
                titles.append(title); descriptions.append(info['description'])
                self.assertEqual(title, info['title'])
                self.assertLessEqual(len(title), 70)
                self.assertLessEqual(len(info['description']), 180)
                self.assertEqual(page.find('html')[0]['lang'], 'es-MX')
                self.assertEqual(len(page.find('h1')), 1)
                self.assertEqual(len(page.ids), len(set(page.ids)), 'duplicate IDs')
                self.assertEqual(len(page.find('meta', name='description')), 1)
                self.assertEqual(page.find('meta', name='description')[0]['content'], info['description'])
                self.assertEqual(page.find('meta', property='og:locale')[0]['content'], 'es_MX')
                self.assertEqual(page.find('meta', property='og:image')[0]['content'], BASE+'/assets/og-image.png')
                self.assertEqual(page.find('meta', name='twitter:card')[0]['content'], 'summary_large_image')
                robots = page.find('meta', name='robots')[0]['content']
                self.assertEqual('noindex' in robots, not info.get('indexable', True))
                if info['type'] != 'error':
                    self.assertEqual(page.find('link', rel='canonical'), [{'rel':'canonical', 'href':BASE+info['path']}])
                    alternates = page.find('link', rel='alternate')
                    self.assertTrue(any(x.get('hreflang') == 'es-MX' and x['href'] == BASE+info['path'] for x in alternates))
                self.assertEqual(len(page.find('script', src='/assets/cookie-consent.js')), 1)
                self.assertEqual(len(page.find('script', src='/assets/analytics.js')), 1)
                self.assertEqual(len(page.find('button', **{'data-cookie-preferences':None})), 1)
                self.assertNotIn('cdn.vercel-insights.com', html)
                self.assertNotIn('YOUR_PIXEL_ID', html)
        self.assertEqual(len(titles), len(set(titles)))
        self.assertEqual(len(descriptions), len(set(descriptions)))

    def test_structured_data_and_breadcrumbs(self):
        for name, info in PAGES.items():
            with self.subTest(page=name):
                html = (ROOT/name).read_text()
                blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
                if info['type'] == 'error': self.assertEqual(blocks, []); continue
                self.assertEqual(len(blocks), 1)
                schema = json.loads(blocks[0]); self.assertEqual(schema['@context'], 'https://schema.org')
                nodes = schema['@graph']; kinds = [n['@type'] for n in nodes]
                org = next(n for n in nodes if n['@type'] == 'Organization')
                self.assertEqual(org['areaServed']['name'], 'México')
                self.assertEqual(org['contactPoint']['availableLanguage'], ['es-MX'])
                for n in nodes:
                    if 'url' in n: self.assertTrue(n['url'].startswith(BASE))
                    self.assertNotIn('aggregateRating', n)
                    self.assertNotIn('offers', n)
                if info['path'] != '/':
                    crumbs = next(n for n in nodes if n['@type'] == 'BreadcrumbList')['itemListElement']
                    self.assertEqual(crumbs[-1]['item'], BASE+info['path'])
                    self.assertEqual([x['position'] for x in crumbs], list(range(1,len(crumbs)+1)))
                if info['type'] == 'article':
                    article = next(n for n in nodes if n['@type'] == 'Article')
                    self.assertEqual(article['datePublished'], info['published'])
                    self.assertEqual(article['dateModified'], info['modified'])
                    self.assertIn('Equipo de Sorta</a>', html)
                if info['type'] == 'collection':
                    collection = next(n for n in nodes if n['@type'] == 'CollectionPage')
                    self.assertEqual({item['url'] for item in collection['mainEntity']['itemListElement']}, {BASE + info['path'] for info in PAGES.values() if info['type'] == 'article'})
                self.assertNotIn('LocalBusiness', kinds)
                self.assertNotIn('MedicalClinic', kinds)

    def test_internal_links_images_and_anchors(self):
        for name in PAGES:
            page = Page((ROOT/name).read_text())
            for tag, attrs in page.tags:
                raw = attrs.get('href') if tag == 'a' else attrs.get('src') if tag in ('script','img') else None
                if not raw: continue
                url = urlsplit(raw)
                if url.netloc or url.scheme: continue
                path = unquote(url.path)
                if not path: target = ROOT/name
                elif path == '/': target = ROOT/'index.html'
                else:
                    target = ROOT/path.lstrip('/') if path.startswith('/') else (ROOT/name).parent/path
                    if not target.suffix: target = target.with_suffix('.html')
                self.assertTrue(target.is_file(), (name, raw))
                if url.fragment and target.suffix == '.html':
                    self.assertIn(unquote(url.fragment), Page(target.read_text()).ids, (name, raw))

    def test_sitemap_only_lists_indexable_mx_pages(self):
        urls = ET.parse(ROOT/'sitemap.xml').findall('{*}url')
        expected = {BASE+i['path'] for i in PAGES.values() if i.get('indexable', True)}
        actual = [u.find('{*}loc').text for u in urls]
        self.assertEqual(set(actual), expected)
        self.assertEqual(len(actual), len(set(actual)))
        self.assertNotIn(BASE+'/privacidad', actual)
        self.assertNotIn(BASE+'/terminos', actual)
        self.assertNotIn(BASE+'/404', actual)
        self.assertIn('Sitemap: '+BASE+'/sitemap.xml', (ROOT/'robots.txt').read_text())
        self.assertNotIn('Disallow: /', (ROOT/'robots.txt').read_text())

    def test_primary_guide_discovery(self):
        for slug in ['automatizar-formatos-medicos-whatsapp','checklist-formatos-consultorio']:
            for parent in ['index.html','recursos.html']:
                self.assertIn('href="/recursos/'+slug+'"', (ROOT/parent).read_text())
        self.assertTrue((ROOT/'assets/downloads/checklist-formatos-consultorio.txt').is_file())

if __name__ == '__main__': unittest.main()
