---
auto_translation: true
title: Markdown Auto Translation
date: 2021-10-09 18:59:37
tags: [Hexo, i18n, JS, Node.js]
excerpt: I built a markdown translation utility by JS using Google Translation API.
project_link: "https://github.com/RandomNamer/MarkdownTranslator"
---

When building a personal blog, we often have international needs. Technically, various blog frameworks have complete i18n solutions, so the biggest challenge for bloggers is content translation. Driven by artificial intelligence, machine translation has been quite perfect, and it is obviously no problem to meet the reading needs of readers in other languages, so a very realistic solution is to develop an automatic translation tool for your blog that calls machine translation API.

The address of this project: https://github.com/RandomNamer/MarkdownTranslator

<img src="image-20211012150904830.png" alt="image-20211012150904830" style="zoom:50%;" />

# development process

In order to ensure the accuracy and reliability of the translation, I chose the Google Translate API here. Of course, due to the special network environment in mainland China, there are still a lot of troubles in the process of using Google Translate, although I don't know when I just started developing it.

## Experiment with the Markdown format that Google Translate will erase

Here I only tested some commonly used markdown format translations, and support for other special formats will continue to be developed.

- List item: the space between "-" and the text will be removed
- Code block: "`" will be removed from the code block
- Inline code: will not change, but the content may be changed
- The space between "#" and the text will be removed
- Numbered list items: won't be changed
- Italic and bold: will not be destroyed
- Link: Will not be broken

## Get Google Translate API
Google Translate is a paid service in Google Cloud. Although Google Translate comes with a $300 trial quota when registering, which is sufficient for personal translation purposes, it is not convenient to register a Google Cloud account with personal information and an international credit card. Here is an API used by the client of Google Translate: `https://translate.google.cn/translate_a/single`, the important query params mainly include:
- sl:
- tl:
- q:
- tk:
Here is an implementation of Token calculation:
```JavaScript
export function token(a) {
    var k = "";
    var b = 406644;
    var b1 = 3293161072;
 
    var jd = ".";
    var sb = "+-a^+6";
    var Zb = "+-3^+b+-f";
 
    for (var e = [], f = 0, g = 0; g < a.length; g++) {
        var m = a.charCodeAt(g);
        128 > m ? e[f++] = m: (2048 > m ? e[f++] = m >> 6 | 192 : (55296 == (m & 64512) && g + 1 < a.length && 56320 == (a.charCodeAt(g + 1) & 64512) ? (m = 65536 + ((m & 1023) << 10) + (a.charCodeAt(++g) & 1023), e[f++] = m >> 18 | 240, e[f++] = m >> 12 & 63 | 128) : e[f++] = m >> 12 | 224, e[f++] = m >> 6 & 63 | 128), e[f++] = m & 63 | 128)
    }
    a = b;
    for (f = 0; f < e.length; f++) a += e[f],
        a = RL(a, sb);
    a = RL(a, Zb);
    a ^= b1 || 0;
    0 > a && (a = (a & 2147483647) + 2147483648);
    a %= 1E6;
    return a.toString() + jd + (a ^ b)
};
 
function RL(a, b) {
    var t = "a";
    var Yb = "+";
    for (var c = 0; c < b.length - 2; c += 3) {
        var d = b.charAt(c + 2),
            d = d >= t ? d.charCodeAt(0) - 87 : Number(d),
            d = b.charAt(c + 1) == Yb ? a >>> d: a << d;
        a = b.charAt(c) == Yb ? a + d & 4294967295 : a ^ d
    }
    return a
}
```

### Access through proxy

**Notice!** Node will not use the system proxy by default, which will cause network requests from Node to be blocked inside the wall even if the machine can already access the off-wall website through the proxy. At this time, we need to configure a proxy for Node before we can use Google Translate API normally. But for the network request library Axios that many people like to use, simply using the built-in proxy may not work for https sites like Google Translate. The basic solutions are:

- Use ProxyAgent, such as [tunnel](https://www.npmjs.com/package/tunnel),
- Use modified version of Axios, `axios-https-proxy-fix`
- Use `request`

A ready-made Google Translate API package is `translate-google-api`, which can be installed directly via `npm install translate-google-api`. We can see the code in it, basically using axios to initiate a request using the API just now, but due to the bug that axios has on the https proxy, this module is basically unavailable in mainland China.

### Restrictions

This API is provided for the client of Google Translate, so it comes with anti-crawler settings. Generally speaking, one IP can completely translate an article, but the next one needs to switch to the next proxy address, otherwise error 429 will be returned.



