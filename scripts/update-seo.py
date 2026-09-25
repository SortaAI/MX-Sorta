#!/usr/bin/env python3
"""Generate crawlable metadata, structured data and sitemap from reviewed page data.

Run from any directory: python3 scripts/update-seo.py
Dates are editorial values in seo-pages.json, never the date this script runs.
"""
from pathlib import Path
from html import escape, unescape
import json
import re

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://mx.getsorta.io'
PAGES = json.loads((ROOT / 'scripts/seo-pages.json').read_text())
OG = BASE + '/assets/og-image.png'


def text(value):
    return ' '.join(unescape(re.sub('<[^>]+>', ' ', value)).split())


def meta(name, value, attr='name'):
    return f'  <meta {attr}="{name}" content="{escape(value, quote=True)}">'


# Preserve the existing company facts rather than borrowing the US market schema.
root_html = (ROOT / 'index.html').read_text()
org = None
for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', root_html, re.S):
    for node in json.loads(block).get('@graph', []):
        if node.get('@type') == 'Organization':
            org = node
            break
assert org, 'Existing organization metadata is required'
org.update({
    '@id': BASE + '/#organization', 'name': 'Sorta', 'url': BASE + '/',
    'description': 'Automatización de formatos médicos para clínicas y consultorios en México.',
    'areaServed': {'@type': 'Country', 'name': 'México'},
    'contactPoint': {'@type': 'ContactPoint', 'contactType': 'Atención a consultorios',
                     'email': 'hola@getsorta.io', 'availableLanguage': ['es-MX'],
                     'areaServed': 'MX', 'url': BASE + '/contacto'}
})
website = {'@type': 'WebSite', '@id': BASE + '/#website', 'name': 'Sorta México',
           'alternateName': 'Sorta', 'url': BASE + '/', 'inLanguage': 'es-MX',
           'publisher': {'@id': org['@id']}}
service = {'@type': 'Service', '@id': BASE + '/#service',
           'name': 'Automatización de formatos médicos para consultorios',
           'serviceType': 'Automatización de papeleo clínico',
           'description': 'Preparación de los formatos existentes del consultorio a partir de una sola captura, con revisión humana antes de firmar o archivar.',
           'provider': {'@id': org['@id']}, 'areaServed': {'@type': 'Country', 'name': 'México'},
           'url': BASE + '/como-funciona'}

for filename, info in PAGES.items():
    path = ROOT / filename
    html = path.read_text()
    url = BASE + info['path']
    html = re.sub(r'<body([^>]*)>', lambda m: '<body' + re.sub(r'\sdata-page-type="[^"]*"', '', m[1]) + f' data-page-type="{info["type"]}">', html, count=1)
    # The same project IDs as the US site, with one loader and event adapter.
    html = re.sub(r'\s*<script[^>]+src="https://cdn\.vercel-insights\.com/[^\"]+"[^>]*></script>', '', html)
    html = re.sub(r'\s*<script src="/assets/analytics.js" defer></script>', '', html)
    html = html.replace('<script src="/assets/cookie-consent.js" defer></script>', '<script src="/assets/cookie-consent.js" defer></script>\n  <script src="/assets/analytics.js" defer></script>')
    if 'data-cookie-preferences' not in html:
        html = html.replace('<a href="/terminos">Términos</a></nav>', '<a href="/terminos">Términos</a><button type="button" data-cookie-preferences>Cookies</button></nav>')
    # The US consent implementation gates replay; additionally mask contact form content.
    html = html.replace('<div class="contact-card">', '<div class="contact-card" data-clarity-mask="true">')
    # CTA labels are static; free-text form inputs are never used as event properties.
    html = re.sub(r'(<a\b[^>]*class="[^"]*\bbutton\b[^"]*"[^>]*)(>)',
                  lambda m: m[1] + ('' if 'data-track=' in m[1] else ' data-track="primary_cta"') + m[2], html)
    if info['type'] not in ('home', 'article', 'error', 'legal') and 'class="page-breadcrumbs' not in html:
        crumb = f'<nav class="page-breadcrumbs wrap" aria-label="Migas de pan"><a href="/">Inicio</a><span aria-hidden="true">/</span><span aria-current="page">{info["label"]}</span></nav>'
        html = html.replace('<main class="page-main" id="contenido">', '<main class="page-main" id="contenido">\n    ' + crumb)
    if info['type'] == 'article' and 'Equipo de Sorta</a>' not in html:
        html = html.replace('<div class="article-meta">', '<div class="article-meta"><a href="/nosotros" rel="author">Equipo de Sorta</a>')

    # Metadata is emitted once, consistently, rather than appended on each run.
    head, rest = html.split('</head>', 1)
    head = re.sub(r'\s*<title>.*?</title>', '', head, flags=re.S)
    head = re.sub(r'\s*<meta\s+(?:name|property)="(?:description|robots|og:[^"]+|twitter:[^"]+|article:[^"]+)"[^>]*>', '', head)
    head = re.sub(r'\s*<link rel="(?:canonical|alternate)"[^>]*>', '', head)
    head = re.sub(r'\s*<script type="application/ld\+json">.*?</script>', '', head, flags=re.S)
    indexing = info.get('indexable', True)
    lines = [f'  <title>{escape(info["title"])}</title>', meta('description', info['description']),
             meta('robots', 'index, follow, max-image-preview:large' if indexing else 'noindex, follow')]
    if info['type'] != 'error':
        lines.append(f'  <link rel="canonical" href="{url}">')
        alternates = info.get('alternates', {'es-MX': url})
        for locale, target in alternates.items():
            lines.append(f'  <link rel="alternate" hreflang="{locale}" href="{target}">')
    for key, value in {'type': 'article' if info['type'] == 'article' else 'website',
                       'site_name': 'Sorta México', 'locale': 'es_MX', 'url': url,
                       'title': info['title'], 'description': info['description'],
                       'image': OG, 'image:width': '1200', 'image:height': '630',
                       'image:alt': 'Sorta México — Automatización de formatos médicos para consultorios'}.items():
        lines.append(meta('og:' + key, value, 'property'))
    for key, value in {'card': 'summary_large_image', 'title': info['title'], 'description': info['description'], 'image': OG,
                       'image:alt': 'Sorta México — Automatización de formatos médicos'}.items():
        lines.append(meta('twitter:' + key, value))
    if 'published' in info:
        lines.extend([meta('article:published_time', info['published'], 'property'),
                      meta('article:modified_time', info['modified'], 'property')])

    if info['type'] != 'error':
        page = {'@type': {'about': 'AboutPage', 'contact': 'ContactPage', 'collection': 'CollectionPage'}.get(info['type'], 'WebPage'),
                '@id': url + '#webpage', 'url': url, 'name': info['title'], 'description': info['description'],
                'inLanguage': 'es-MX', 'isPartOf': {'@id': website['@id']},
                'publisher': {'@id': org['@id']}}
        graph = [org, website, page]
        if info['type'] in ('home', 'product'):
            graph.append(service)
            page['mainEntity'] = {'@id': service['@id']}
        if info['type'] == 'about': page['about'] = {'@id': org['@id']}
        if info['path'] != '/':
            crumbs = [{'@type': 'ListItem', 'position': 1, 'name': 'Inicio', 'item': BASE + '/'}]
            if info['type'] == 'article':
                crumbs.append({'@type': 'ListItem', 'position': 2, 'name': 'Recursos', 'item': BASE + '/recursos'})
            crumbs.append({'@type': 'ListItem', 'position': len(crumbs) + 1, 'name': info['label'], 'item': url})
            graph.append({'@type': 'BreadcrumbList', '@id': url + '#breadcrumb', 'itemListElement': crumbs})
            page['breadcrumb'] = {'@id': url + '#breadcrumb'}
        if info['type'] == 'article':
            heading = text(re.search(r'<h1[^>]*>(.*?)</h1>', html, re.S)[1])
            article = {'@type': 'Article', '@id': url + '#article', 'headline': heading, 'description': info['description'],
                       'url': url, 'inLanguage': 'es-MX', 'mainEntityOfPage': {'@id': page['@id']},
                       'datePublished': info['published'], 'dateModified': info['modified'],
                       'author': {'@type': 'Organization', 'name': 'Equipo de Sorta', 'url': BASE + '/nosotros'},
                       'publisher': {'@id': org['@id']}, 'image': [OG],
                       'about': {'@type': 'Thing', 'name': 'Automatización de formatos médicos en consultorios de México'}}
            graph.append(article)
            page['mainEntity'] = {'@id': article['@id']}
        if info['type'] == 'collection':
            items = [{'@type': 'ListItem', 'position': i + 1, 'name': item['label'], 'url': BASE + item['path']}
                     for i, item in enumerate(p for p in PAGES.values() if p['type'] == 'article')]
            page['mainEntity'] = {'@type': 'ItemList', 'itemListElement': items}
        lines.append('  <script type="application/ld+json">\n' + json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False, indent=2) + '\n  </script>')
    path.write_text(head.rstrip() + '\n' + '\n'.join(lines) + '\n</head>' + rest)

urls = []
for info in PAGES.values():
    if not info.get('indexable', True): continue
    mod = f'\n    <lastmod>{info["modified"]}</lastmod>' if info.get('modified') else ''
    urls.append(f'  <url>\n    <loc>{BASE + info["path"]}</loc>{mod}\n  </url>')
(ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + '\n'.join(urls) + '\n</urlset>\n')
print(f'Updated {len(PAGES)} pages; sitemap contains {len(urls)} indexable Mexico URLs.')
