const marked = require("marked");
const fs = require("fs");
// const axiosRequest = require("axios").default;
const axiosRequest = require("axios-https-proxy-fix").default;
const { resolve } = require("path");
// const tunnel = require("tunnel")
// const tunnelProxy = tunnel.httpsOverHttp({
//     proxy: {
//         host: "127.0.0.1",
//         port: 7890
//     }
// })

const G_API = "https://translate.google.cn/translate_a/single";
const proxy = {
  host: "127.0.0.1",
  port: 7890,
};
const sourceLanguage = "zh-CN";
const destLanguage = "en";

const isDebug = true;

test();

function test() {
  const articlePath = "./source/_posts/blog-with-hexo-and-gh-pages.md";
  const newArticlePath = "./test/";
  fs.readFile(articlePath, "utf-8", (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    if (isDebug) console.log("Read markdown file:\n ", data);
    articleTranslator(data).then((res) => {
      if (isDebug) console.log("translated markdown:\n ", res);
      fs.writeFile(
        newArticlePath +
          articlePath.split("/").pop().split(".")[0] +
          `-${destLanguage}.md`,
        res,
        { flag: "w+" },
        (err) => {
          if (err) {
            console.error(err);
            return;
          }
        }
      );
    });
  });
}

/**
 * @param  {string} article
 * @returns {Promise(string)}
 */
async function articleTranslator(article) {
  const paragraphRegex = /\n([^\n]+)\n/g
  const headingRegex = /(#+)([^\n]+)/g;
  const inlineCodeRegex = /`{1,2}[^`](.*?)`{1,2}/;
  const codeBlockRegex = /```([\s\S]*?)```[\s]?/;
  const frontMatterRegex = /---([\s\S]*?)---[\s]?/;
  const listRegex = /^[\\s]*[-\\*\\+] +(.*)/;
  const numberedListRegex = /^[\\s]*[0-9]+\\.(.*)/;
  if (isDebug) console.log("Starting Translation");
  let translatedArticle = await replaceAsync(
    article,
    headingRegex,
    async (match, body, offset, string) => {
      var failed = false;
      let destBody = await translateG(body, sourceLanguage, destLanguage).catch(
        (e) => {
          if (isDebug) console.log(`Translating ${match} to ${destLanguage} failed`);
          failed = true;
        }
      );
      if (failed) destBody = body;
      return [head, " ", destBody, "\n"].join("");
    }
  );
  return translatedArticle;
}
/**
 * @param  {string} str
 * @param  {RegExp} reg
 * @param  {async function} callback
 */
async function replaceAsync(str, regex, callback) {
  const promiseQueue = [];
  str.replace(regex, (...args) => {
    promiseQueue.push(callback(...args));
  });
  let replaces = await Promise.all(promiseQueue);
  return str.replace(regex, () => replaces.shift());
}

/**
 * @param  {string} snippet
 * @param  {string} sl
 * @param  {string} tl
 * @returns {Promise}
 */
async function translateG(snippet, sl, tl) {
  if (isDebug) console.log(`Translating Text: ${snippet}`);
  let resp = await axiosRequest.get(G_API, {
    params: {
      client: "at",
      sl: sl,
      tl: tl,
      dt: "t",
      q: snippet,
    },
    proxy: proxy,
  });
  //   if (isDebug) console.log(`Raw response: ${resp}`);
  let destBody = resp.data[0].map((resultStruct) => resultStruct[0]).join("");
  if (isDebug) console.log(`Reconstructed paragraph: ${destBody}`);
  return destBody;
}
