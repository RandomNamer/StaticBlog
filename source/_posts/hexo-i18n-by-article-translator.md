---
title: hexo-i18n-by-article-translator
date: 2021-10-09 18:59:37
tags: [hexo, i18n, JS, Node]
---

## 一些记录
### 试验Google Translate会抹掉的Markdown格式
- 列表项目：会把“-”和文字之间的空格去掉
- 代码块：会将代码块的"`"移除
**注意！**Node默认是不会走系统代理的，这会导致即使本机已经可以通过代理访问墙外网站，从Node发出的网络请求也还是会被阻挡在墙内。这时我们需要为Node配置代理后方可正常使用Google Translate API。但是对于很多人喜欢使用的网络请求库Axios而言，单纯使用内置的代理可能会对Google Translate这样的https站点不生效。解决方案基本有：
- 使用ProxyAgent，如[tunnel](https://www.npmjs.com/package/tunnel), 而不是Axios的`proxy`。
- 使用修改版Axios，`axios-https-proxy-fix`
- 使用`request`


一个类似的Google Translate API封装是translate-google-api， 可以直接通过`npm install translate-google-api`进行安装。