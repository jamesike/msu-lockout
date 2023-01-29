// browser.js
// used to manage puppeter logic and management for harvesting state token
// this version of puppeteer is using a custom version of firefox-nightly used to bypass fingerprinting
const { Cluster } = require('puppeteer-cluster');

//gen variables
const GEN_TIME_LIMIT = 25000 //how long we want to sit and gen for
const generateURL = 'https://auth.msu.edu'

//used to create / launch browser to start gen
function createCluster(i, addToken) {
    return new Promise(async(resolve,reject) => {
        //create cluster instance
        var clusterInstance = await Cluster.launch({
            concurrency: Cluster.CONCURRENCY_BROWSER,
            maxConcurrency: 1,
            monitor:false,
            timeout:GEN_TIME_LIMIT, 
            puppeteerOptions: {
                headless:true,
                args: ['--no-sandbox', '--proxy-server=p.webshare.io:9999'],
            },
          });

        //error handler
        clusterInstance.on('taskerror', (err, data) => {
            console.log(err)
        });
        
        //task handler
        await clusterInstance.task(async({ page }) => {
            try {
                // enable request interception
                await page.setRequestInterception(true);

                // listen for request events
                var grabbedToken = false // used to know when we grabbed token
                page.on('request', interceptedRequest => {
                    //block css, images, and fonts
                    if (interceptedRequest.resourceType() === 'stylesheet' || 
                        interceptedRequest.resourceType() === 'image' || 
                        interceptedRequest.resourceType() === 'font') {
                        interceptedRequest.abort();
                    } else { 
                        if (interceptedRequest.url().includes("introspect") && interceptedRequest.method() == "POST") {
                            addToken(JSON.parse(interceptedRequest.postData()))
                            grabbedToken = true
                        }
    
                        //request can continue
                        interceptedRequest.continue();
                    }
                });

                //log
                console.log("Browser [" + i + "] Attempting to grab State Token")

                //visit page
                await page.goto(generateURL); 

                //wait until we grabbed token
                await new Promise((resolve) => {
                    setTimeout(() => {
                        if (grabbedToken) resolve(true)
                    }, 500) //poll every 500ms
                })
            } catch(err) { 
                resolve(false)
            }
        });
    
        //assign work 
        await clusterInstance.queue()

        //await for finished cluster and close
        await clusterInstance.idle();

        //close and resolve
        await clusterInstance.close();    
        resolve(false)    
    })
}

//run - used to handle main logic for program
async function run(index, addToken) {
    //start cluster
    await createCluster(index, addToken)
}

//export run function
module.exports = { run }