let a = 0;
setInterval(() => {
    chrome.browserAction.setBadgeText({ text: '' + a++ });
}, 2000)