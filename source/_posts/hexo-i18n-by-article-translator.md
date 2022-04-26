---
title: Markdown文章自动翻译
date: 2021-10-09 18:59:37
tags: [Hexo, i18n, JS, Node]
excerpt: 为了构建英文站点，用JS简简单单撸一个文章自动翻译器。
---

在构建个人博客时，我们经常有国际化的需求。技术上，各种博客框架都有完善的i18n解决方案，所以对博主而言最大的挑战在于内容翻译。在人工智能驱动下，机器翻译已经相当完善，满足其他语言读者阅读需求显然是没问题的，所以一个很现实的解决方案就是为自己的博客开发一个调用机器翻译API的自动翻译工具。

这个项目的地址：https://github.com/RandomNamer/MarkdownTranslator

<img src="image-20211012150904830.png" alt="image-20211012150904830" style="zoom:50%;" />

# 开发过程

为了保证翻译的准确性和可靠性，我这里选择了Google Translate API。当然，由于中国大陆特殊的网络环境，使用Google Translate的过程中还是出了不少麻烦的，虽然刚开始开发的我并不知道。

## 试验Google Translate会抹掉的Markdown格式

这里我只试验了一些常用的markdown格式翻译，对其他特殊格式的支持会持续开发。

- 列表项目：会把“-”和文字之间的空格去掉
- 代码块：会将代码块的"`"移除
- 行内代码：不会改动，但可能内容被更改
- 标题：‘#’与文字之间的空格会被去掉
- 数字列表项目: 不会破坏格式
- 斜体和粗体：不会被破坏
- 链接：不会被破坏

## Google Translate API的获取
Google Translate是Google Cloud中的付费服务，虽然Google Translate在注册时自带300美元试用额度，足够个人翻译用途，但注册Google Cloud账号需要提供个人信息和国际信用卡，不够方便。这里给出一个Google翻译的客户端使用的API：`https://translate.google.cn/translate_a/single`，重要的query params主要有：
- sl: Source Language
- tl: Destination Language
- q: 要翻译的文字
- tk: 翻译的Token，由原文字计算得出。
这里给出Token计算的一种实现：
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

### 通过代理访问

**注意！**Node默认是不会走系统代理的，这会导致即使本机已经可以通过代理访问墙外网站，从Node发出的网络请求也还是会被阻挡在墙内。这时我们需要为Node配置代理后方可正常使用Google Translate API。但是对于很多人喜欢使用的网络请求库Axios而言，单纯使用内置的代理可能会对Google Translate这样的https站点不生效。解决方案基本有：

- 使用ProxyAgent，如[tunnel](https://www.npmjs.com/package/tunnel), 而不是Axios的`proxy`。
- 使用修改版Axios，`axios-https-proxy-fix`
- 使用`request`

一个现成的Google Translate API封装是`translate-google-api`， 可以直接通过`npm install translate-google-api`进行安装。我们可以看到其中的代码，基本上就是用axios使用刚才的API发起请求，但由于axios在https代理上存在的bug，这个模块在中国大陆基本不可用。

### 访问限制

这个API是为谷歌翻译的客户端提供的，因此自带反爬虫设置。一般而言，使用一个IP可以完整翻译一篇文章，但下一篇就需要切换下一个代理地址了，否则会返回错误429。

### 集成到自己的博客

最简单的做法就是复制一份英文站点，使用shell脚本构建和发布博客，如`cd en && hexo g && cd .. && hexo clean && hexo g  && cp -R en/public public/en && hexo d`， 即可同时构建两个站点并部署。

