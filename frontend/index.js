// index.js
// used to control js for msu-lockout
const API_URL = "https://api.msulock.com/sendAttack"

// send_attack - used to check UI form, and send attack to msu lockout servers
function send_attack() {
    //verify input ( not very good but its fine) 
    if (document.getElementById("emailInput") !== " " && document.getElementById("emailInput").value.length > 4) {
        // update UI that we are sending request
        document.getElementById("sendAttackButton").style.display = "none"
        document.getElementById("sendingAttackDiv").style.display = "block"
        document.getElementById("emailInput").disabled = true

        // send request
        fetch(API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              account: document.getElementById("emailInput").value + "@msu.edu",
            })
        })
        .then(response => response.json())
        .then(data => {
            //parse response and update that attack was sent
            if (data["status"] == "success") {
                //update UI
                document.getElementById("statusAttackLabel").textContent = "Attack was pushed in queue, please allow up to 5 - 10 minutes for account disability."
            }
        })
        .catch(error => {
            //show error message
            document.getElementById("statusSpinner").style.display = "none"
            document.getElementById("statusAttackLabel").textContent = "There was an error sending attack, please try again later."
        })
    }
}

// attach 'send attack' button to function
document.getElementById("sendAttackButton").addEventListener('click', send_attack)