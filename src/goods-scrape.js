import _ from 'lodash';
import pupp from 'puppeteer';
import database from './db-query.js';

const urls = [];
const result = [];

const queryText = 'SELECT url FROM products';
const dbTargetTable = 'public.scrape_data';
const dbQueryColumns = 'item_no, min_price, currency, qty_sold, rating, scrape_date';
const dbQueryAliases = '$1, $2, $3, $4, $5, $6';
const dbQuery = `INSERT INTO ${dbTargetTable}(${dbQueryColumns}) VALUES(${dbQueryAliases})`;

const runScrape = async () => {
  const browser = await pupp.launch({
    args: [
      '--no-sandbox',
      '--window.size=1920x1080',
      // '--start-maximized',
    ], // '--proxy-server=socks5://127.0.0.1:9052'
    ignoreHTTPSErrors: true,
    headless: true,
    devtools: false,
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 1080,
  });

  for (let i = 0; i < urls.length; i += 1) {
    console.log('open the page: ', urls[i]);
    console.log('current result is:', result);
    await page.goto(`${urls[i]}`, {
      waitUntil: ['networkidle2', 'domcontentloaded'],
    });
    await page.waitForSelector('#container');

    const scrape = await page.evaluate(() => {
      const itemNo = document.querySelector('.j-article').innerHTML.trim();
      let rawMinPrice = 0;
      if (document.querySelector('.final-cost')) {
        rawMinPrice = document.querySelector('.final-cost')
          .innerHTML
          .trim()
          .split('&nbsp;');
      }
      const minPrice = rawMinPrice.length === 2 ?
        Number(rawMinPrice[0]) : Number(`${rawMinPrice[0]}${rawMinPrice[1]}`);
      const currency = 'RUR';
      const rawQtySold = document.querySelector('.j-orders-count')
        .innerHTML
        .trim()
        .slice(6)
        .split('&nbsp;');
      const qtySold = rawQtySold.length === 2 ?
        Number(rawQtySold[0]) : Number(`${rawQtySold[0]}${rawQtySold[1]}`); 
      const rating = Number(document.querySelector('.stars-line-lg > span').innerHTML);
      const scrapeDate = new Date().toJSON().slice(0, 10);

      return [itemNo, minPrice, currency, qtySold, rating, scrapeDate];
    });
    result.push(scrape);
  }
  // setTimeout(browser.close(), 3000);
};

const run = () => {
  database.connectDbServer();

  (async () => {
    const rawUrls = await database.readData(queryText);
    urls.push(..._.map(rawUrls.rows, 'url'));

    await runScrape();

    result.forEach((item) => {
      database.insertData(dbQuery, item);
    });
    setTimeout(database.closeDbConnection, 60000); // to be clarify
  })();
};

run();
