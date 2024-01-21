const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: false, ignoreHTTPSErrors: true });
    const page = await browser.newPage();
    page.setDefaultTimeout(50000);

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
    await page.click('.category-section > li:nth-child(2) > a:nth-child(1)');    // click 'otomobil'
    await page.waitForTimeout(2000);
    let carModelsLinks = [];
    const weblinks = await page.evaluate(() => {
        console.log("weblinks triggered")
        const links = Array.from(document.querySelectorAll('.category-list-wrapper > ul > li > a'));
        return links.map(link => link.href);
    });
    carModelsLinks.push(...weblinks);

    for (let i = 0; i < carModelsLinks.length; i++) {
        await page.goto(carModelsLinks[i], { waitUntil: 'networkidle2' });
        console.log("carModelsLinks triggered")

        const hasChildNodes = await page.evaluate(() => {
            const wrapper = document.querySelector('.category-list-wrapper');
            return wrapper && wrapper.hasChildNodes();
        });

        if (!hasChildNodes) continue;

        const newLinks = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('.category-list-wrapper > ul > li > a'));
            return links.map(link => link.href);
        });
        carModelsLinks = carModelsLinks.concat(newLinks);
        console.log("newLinks triggered")
        console.log(newLinks)
    }

    let carListings = [];
    for (let i = 0; i < carModelsLinks.length; i++) {
        console.log("items contained: ", carListings.length)
        console.log("carListings triggered: ", carModelsLinks[i])
        await page.goto(carModelsLinks[i], { waitUntil: 'networkidle2' });

        const childLinks = await page.evaluate(() => {
            const childNodes = document.querySelector('#main-listing > tbody:nth-child(2) > tr > td > div > a');
            return childNodes.href;
        });

        carListings.push(childLinks);
    }
    const carListingsJSON = JSON.stringify(carListings);

    const fetchCarInformation = async (page, url) => {
        await page.goto(url, { waitUntil: 'networkidle2' });

        //fetch marka, seri, model
        const carDetails = await page.evaluate(() => {
            const detailElements = Array.from(document.querySelectorAll('div.property-item:nth-child(3), div.property-item:nth-child(4), div.property-item:nth-child(5)'));
            let details = {};
            detailElements.forEach((element) => {
                const detailKey = element.querySelector('.property-key').textContent.trim();
                const detailValue = element.querySelector('.property-value').textContent.trim();
                details[detailKey] = detailValue;
            });
            return details;
        });

        let carInformation = {}; // Declare carInformation here

        // Merge carDetails into carInformation
        Object.assign(carInformation, carDetails);

        await page.click('#head-tab-car-information'); // click car information tab to get car details

        const additionalCarInformation = await page.evaluate(() => {
            const infoElements = Array.from(document.querySelectorAll('div.tab-content-car-information-container:nth-child(-n+4) > ul > li'));
            let info = {};
            infoElements.forEach((element) => {
                const propertyKey = element.querySelector('.property-key').textContent.trim();
                const propertyValue = element.querySelector('.property-value').textContent.trim();
                info[propertyKey] = propertyValue;
            });
            return info;
        });

        // Merge additionalCarInformation into carInformation
        Object.assign(carInformation, additionalCarInformation);

        return carInformation;
    };

    const saveCarInformation = async (carInformation) => {
        const carInformationJSON = JSON.stringify(carInformation, null, 2); // format JSON

        fs.appendFile('CarInformation.json', carInformationJSON + ',\n', (err) => {
            if (err) {
                console.error('Error writing file', err)
            } else {
                console.log('JSON object added to Dataset.json.')
            }
        });
    };

    for (let i = 0; i < carListings.length; i++) {
        const carInformation = await fetchCarInformation(page, carListings[i]);
        await saveCarInformation(carInformation);
    }

    console.log('Scraping completed.');
    await browser.close();
})();
