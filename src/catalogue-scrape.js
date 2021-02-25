import pupp from 'puppeteer';
import { URL } from 'url';
import consumerRequest from './consumer-request.js';
import database from './db-query.js';

const makeCurrentUrl = (request, num) => {
  const searchParams = new URLSearchParams({
    search: `${request}`,
    xsearch: true,
    page: `${num}`,
  }).toString();
  const currentUrl = new URL('/catalog/0/search.aspx', 'https://www.wildberries.ru');
  currentUrl.search = searchParams;
  return currentUrl.href;
};

const makeUrlsSet = ({ request, pagesQtyForTraversal: lastPage }) => {
  for (let i = 1; i <= lastPage; i += 1) {
    urls.push(makeCurrentUrl(request, i));
  }
};

const urls = [];
const result = [];

const dbTargetTable = 'public.products';
const dbQueryColumns = 'item_no, trade_mark, item_name, url';
const dbQueryAliases = '$1, $2, $3, $4';
const dbQuery = `INSERT INTO ${dbTargetTable}(${dbQueryColumns}) VALUES(${dbQueryAliases})`; 

const runScrape = async () => {
  const browser = await pupp.launch({
    args: [
      '--no-sandbox',
      '--window.size=1920x1080',
      // '--start-maximized',
    ], // '--proxy-server=socks5://127.0.0.1:9052'
    ignoreHTTPSErrors: true,
    headless: false,
    devtools: false,
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 1080,
  });

  for (const url of urls) {
    await page.goto(url, {
      waitUntil: ['networkidle2', 'domcontentloaded'],
    });
    await page.waitForSelector('#catalog-content');

    const scrapedData = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('div.dtList.i-dtList.j-card-item'));
      return allElements.reduce((acc, element) => {
        const itemNo = element.getAttribute('data-catalogercod1s');
        const tradeMark = element.querySelector('strong.brand-name.c-text-sm')
          .innerHTML
          .split('<span>')[0]
          .trim();
        const itemName = element.querySelector('span.goods-name.c-text-sm').innerHTML.trim();
        const anchor = element.querySelector('a.ref_goods_n_p.j-open-full-product-card');
        const url = `${anchor.href}`;
        return [...acc, [itemNo, tradeMark, itemName, url]];
      }, []);
    });
    result.push(...scrapedData);
  }
  // setTimeout(browser.close(), 10000);
};

const dbConnect = async () => {
  await database.connectDbServer();
  result.forEach((item) => {
    database.insertData(dbQuery, item);
  });
};

export default (() => {
  try {
    makeUrlsSet(consumerRequest);
    runScrape();
  } catch (error) {
    console.error(`Something went wrong: ${error}`);
  }
  setTimeout(dbConnect, 15000);
  setTimeout(database.closeDbConnection, 40000);
})();
