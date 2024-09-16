async function getOAuthToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, function (token) {
        if (chrome.runtime.lastError || !token) {
            reject(chrome.runtime.lastError);
            return;
        }
        resolve(token);
    });
  });
}