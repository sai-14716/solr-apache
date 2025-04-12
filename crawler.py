import os
import requests
from bs4 import BeautifulSoup

def crawl_urls(urls, download_dir='crawled_data'):
    if not os.path.exists(download_dir):
        os.makedirs(download_dir)

    downloaded_files = []
    for idx, url in enumerate(urls):
        try:
            response = requests.get(url)
            soup = BeautifulSoup(response.content, 'html.parser')
            text = soup.get_text()
            file_path = os.path.join(download_dir, f'page_{idx}.txt')
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(text)
            downloaded_files.append(file_path)
        except Exception as e:
            print(f"Failed to crawl {url}: {e}")

    return downloaded_files
