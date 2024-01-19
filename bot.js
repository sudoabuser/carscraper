const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: true, ignoreHTTPSErrors: true });
    const page = await browser.newPage();

    await page.goto('https://www.arabam.com', { waitUntil: 'networkidle2' });

    const cookieButtonSelector = '#onetrust-accept-btn-handler';

    try {
        await page.waitForSelector(cookieButtonSelector, { timeout: 5000 });
        console.log('Cookie consent button found. Clicking it...');
        await page.click(cookieButtonSelector);
        console.log('Cookie consent button clicked.');
    } catch (error) {
        console.error('Cookie consent button not found. Proceeding without clicking it.');
    }

    await page.waitForTimeout(500);
    await page.click('.category-section > li:nth-child(2) > a:nth-child(1)');
    await page.waitForTimeout(2000);
    let carModelsLinks = [];
    const weblinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('.category-list-wrapper > ul > li > a'));
        return links.map(link => link.href);
    });
    carModelsLinks.push(...weblinks);


    for (let i = 0; i < carModelsLinks.length; i++) {
        await page.goto(carModelsLinks[i], { waitUntil: 'networkidle2' });

        const hasChildNodes = await page.evaluate(() => {
            const wrapper = document.querySelector('.category-list-wrapper');
            return wrapper && wrapper.hasChildNodes();
        });

        if (!hasChildNodes) continue;

        const newLinks = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('.category-list-wrapper > ul > li > a'));
            return links.map(link => link.href);
        });
        carModelsLinks.push(...newLinks);
    }

    const fs = require('fs');
    const ExcelJS = require('exceljs');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Car Model Links');

    worksheet.columns = [
        { header: 'Car Model Links', key: 'link', width: 50 },
    ];

    carModelsLinks.forEach((link, index) => {
        worksheet.addRow({ link });
    });

    await workbook.xlsx.writeFile('CarModelLinks.xlsx');
    console.log('Excel file created with car model links.');

    console.log('car model links:', carModelsLinks);
    await browser.close();
})();
