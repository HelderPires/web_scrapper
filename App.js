const request = require('request-promise');
const cheerio = require('cheerio');
const fs = require('fs');
var http = require('http');
var https = require('https');
http.globalAgent.maxSockets = 3;
https.globalAgent.maxSockets = 3;

function main() {
    const invalidNav = [
        'https://www.boohoo.com/womens/sale/last-chance-to-buy',
    ]
    const url = "https://www.boohoo.com/page/sitemap.html";
    getNavLinks(url)
        .then((response) => {
            const valid =  []
            response.forEach((link) => {
                if(!invalidNav.includes(link)) {
                    valid.push(link)
                }
            });
            getDataFromLinks(valid)
                .then((response) => writeToFile(removeDuplicates(response)))
                .catch((error) => writeToFile(error, 'errorLog'))
        })
        .catch((error) => writeToFile(error, 'errorLog'))

}

function getDataFromLinks(navLinks) {
    return new Promise(((resolve, reject) => {
        let counter = 1
        let products = []
        navLinks.forEach((link, index) => {
            request(link)
                .then((body) => {
                    let parsedChildBody = cheerio.load(body);
                    try {
                        const container = parsedChildBody('.tiles-container')
                        container.each(() => {
                            try {
                                products.push({
                                    id: parsedChildBody('meta[itemprop = "sku"]')
                                        .attr('content'),
                                    url: parsedChildBody('meta[itemprop = "url"]')
                                        .attr('content'),
                                    title: parsedChildBody('div[itemprop = "name"] > a')
                                        .html()
                                        .trim(),
                                    image: parsedChildBody('div[class = "product-image"] > a[class = "thumb-link"] > picture > source')
                                        .first()
                                        .attr('srcset'),
                                    price: parsedChildBody('div[class = "product-pricing"] > div[itemprop = "offers"] > meta[itemprop = "price"]')
                                        .attr('content') +
                                    ' ' +
                                    parsedChildBody('div[class = "product-pricing"] > div[itemprop = "offers"] > meta[itemprop = "priceCurrency"]')
                                        .attr('content')
                                });
                            } catch(error) {
                                console.log('product failed @: ' + product);
                                reject(error);
                            }
                        })
                    } catch(error) {
                        console.log('navLink failed @: ' + navLinks[index]);
                        reject(error);
                    }
                })
                .catch((err) => reject(err))
                .finally(() => {
                    console.log(`nav link: ${navLinks[counter - 1]}`)
                    console.log(`${counter} of ${navLinks.length}`)
                    if (counter === navLinks.length ) {
                        resolve(products);
                    }
                    counter ++
            });
        });
    }))
}
function getNavLinks(url) {
    return new Promise((resolve, reject) => {
        request(url)
            .then((htmlString) => {
                let navLinks = [];
                let $ = cheerio.load(htmlString);
                $('.sitemap-list > li > div > h3 > a').each((index, link) => {
                    if ($(link).attr('href').indexOf('/mens') > -1 || $(link).attr('href').indexOf('/womens') > -1) {
                        navLinks.push($(link).attr('href'))
                    }
                });
                resolve(navLinks);
            })
            .catch((error) => {
                reject(error)
            })
    });
};
function removeDuplicates(dataset){
    const ids = dataset.map((item) => item.id);
    return dataset.filter((item, index) => ids.lastIndexOf(item.id) === index);
}
function writeToFile(data, target = 'output') {
    const timeStamp = new Date().getTime().toString()
    fs.writeFile(`${target}${timeStamp}.json`, JSON.stringify(data), (error) => {
        if (error) throw error;
        if (!error) console.log(`${target}${timeStamp}.json file created`)
    });
};
main();





