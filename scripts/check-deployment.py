"""Read-only deployment smoke check. Usage: python3 scripts/check-deployment.py [--base URL]."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen
from xml.etree import ElementTree

class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.canonicals=[]; self.targets=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='link' and a.get('rel')=='canonical': self.canonicals.append(a.get('href'))
        if tag=='a' and a.get('href'): self.targets.append(a['href'])

def fetch(url):
    with urlopen(Request(url, headers={'User-Agent':'SortaDeploymentCheck/1.0'}),timeout=25) as response:
        return response.read(),response.geturl(),response.headers.get_content_type()

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--base',default='https://mx.getsorta.io');args=parser.parse_args()
    base=args.base.rstrip('/'); production='https://mx.getsorta.io'
    data,_,_=fetch(base+'/sitemap.xml')
    urls=[n.text for n in ElementTree.fromstring(data).findall('{*}url/{*}loc')]
    assert urls and len(urls)==len(set(urls)), 'Empty/duplicate sitemap'
    targets=set(); failures=[]
    for canonical in urls:
        try:
            assert canonical.startswith(production+'/'),canonical
            url=base+canonical[len(production):]
            data,final,kind=fetch(url);assert kind=='text/html',f'Expected HTML: {url}'
            assert final==url,f'Sitemap redirect: {url} -> {final}'
            page=Page();page.feed(data.decode());assert page.canonicals==[canonical],f'Canonical mismatch: {url}'
            for href in page.targets:
                resolved=urljoin(canonical,href);parts=urlsplit(resolved)
                if parts.netloc==urlsplit(production).netloc and parts.scheme in ('https','http'):
                    targets.add(base+parts.path)
        except Exception as error:failures.append(f'{canonical}: {error}')
    def check(url):
        try:
            data,_,kind=fetch(url)
            if '/assets/downloads/' in url:
                assert data and kind!='text/html','Download returned empty content or HTML'
                if url.endswith('.pdf'):assert data.startswith(b'%PDF'), 'Invalid PDF'
                if url.endswith(('.xlsx','.docx')):assert data.startswith(b'PK'), 'Invalid Office archive'
        except Exception as error:return f'{url}: {error}'
    with ThreadPoolExecutor(max_workers=4) as pool:failures += [x for x in pool.map(check,sorted(targets)) if x]
    for failure in failures:print('FAIL',failure)
    print(f'{len(urls)} sitemap pages; {len(targets)} internal destinations; {len(failures)} failures')
    raise SystemExit(bool(failures))
if __name__=='__main__':main()
