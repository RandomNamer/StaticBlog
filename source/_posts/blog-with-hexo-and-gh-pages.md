---
title: 用Hexo和Github Pages搭建静态博客
date: 2021/9/30 14:46:25
tags: [Hexo, Blog, Frontend]
index_img: assets/img/blog-starter.jpg
excerpt: 简简单单搭一个Hexo博客，以及用Github Pages免费托管它
---

# 用Hexo和Github Pages搭建静态博客

个人博客曾经具有很高的门槛，因此在世纪之初时国内涌现了一大批在线博客平台。曾经搭建一个个人博客需要自己编写后端和前端，搞定域名解析服务，并付出不小数目的资金来维持它以合理的速度运行。在2021年，如果只是想体验属于自己的博客，则完全不需要这么做。对于纯静态展示用途（事实上这也是博客最基本、最重要的用途）而言，只需要一个（好看的）静态网页和一个托管平台即可。Github Pages就是这样一个托管平台，它依托于Github的Repository，使用简便，且完全不收费。我们可以直接编写静态前端，用Git推送到远端，就可以自动完成部署。Hexo就是这样一个静态博客生成工具，用它可以更简便地创建静态博客。两者结合就可以在数分钟内完成自己第一个博客的搭建。

## 设置GitHub Pages

在GitHub中新建一个Repository，然后在设置中开启Github Pages托管。

<img src="image-20210923153307744.png"  style="zoom:50%;" />

使用Theme-Chooser，可以生成一个缺省的页面，内容由一个Markdown文档填充。这个markdown文档也是支持嵌入HTML链接的。

<img src="image-20210923153437095.png"  style="zoom:50%;" />

在简单调整之后，我们可以看到一个可以正常显示的静态网页，说明GitHub Pages已经创建成功。

<img src="image-20210923153532574.png"  style="zoom:50%;" />

## 使用Hexo生成静态博客

Hexo是一个在Node.js上运行的工具，为了使用它，首先要确保已经安装Node.

<img src="image-20210923153738209.png" style="zoom:50%;" />

`npm`是Node的包管理工具，我们可以用它安装Hexo。（在macOS上，如果是第一次安装Node，npm可能缺乏文件写权限，可以使用`sudo chown -R $USER /usr/local/lib/node_modules` 为其添加权限解决。）

一切顺利的话，我们就可以使用`npm install -g hexo-cli`安装Hexo了。

安装完成后，我们就有了hexo的命令行工具，通过`hexo init`可以初始化一个博客模版：

<img src="image-20210923160421280.png"  style="zoom:50%;" />

要将其编译为可用的html网页，执行`hexo generate `即可。要在浏览器预览，可以使用`hexo server`, 在本地开启一个服务器进行预览。

<img src="image-20210923161332399.png"  style="zoom:50%;" />

## 部署

一个简单的想法是，每次都在本地手动构建博客，然后推送到GitHub完成更新。但是我们需要将构建后的网页送往Github Pages所用的分支，而源码留在另一个分支。

这里有两种推荐的操作。

- 得益于GitHub可以集成的CI功能，我们不必每次都手动构建，而是**让CI系统帮助我们构建并发布到GitHub Pages绑定的分支**。按照官网的教程：https://hexo.io/zh-cn/docs/github-pages，我们需要配置一个相关的Travis CI服务。注意，Travis CI只对开源Repo有效。
- 所以如果想使用私有Repo托管的话，就只能使用`hexo-deployer-cli`进行部署。Hexo Deployer只需要在`_config.yml`里进行[简单配置](https://hexo.io/docs/one-command-deployment#Git)后，每次只需要用`hexo clean && hexo deploy` 即可完成部署。



## 工作流

这里简单介绍下如何配置Deployer和在本地撰写并发布的工作流程

### Deployer配置和使用

要使用Deployer，只需要在`_config.yml`中配置四个项目即可，下面是一个示例配置：

```yaml
deploy:
  type: git
  repo: https://github.com/RandomNamer/StaticBlogTest.git
  branch: gh-pages
  message: Update pages with local changes on {{ now('YYYY-MM-DD')}}
```

只需要填入正确的repo地址，Github Pages分支和commit message即可。

deployer的操作就是先进行一次生成，再将生成的文件提交到指定的分支，commit message就是之前配置的`message`。

在部署时，只需要执行`hexo clean && hexo d`即可将本地的网站与远端同步

### 正确加载资源

要让网站能正确地工作，还需要最后一步，那就是在`_config.yml`中配置网站的URL。这个URL决定了生成页面中所有链接的具体指向和加载CSS、JS和其他资源文件的路径。如果加载不当，恐怕就会是这样：

<img src="image-20210930125831154.png"  style="zoom:50%;" />

正确配置之后，再执行一次（生成和）部署，正确的网页就可以在GitHub Pages上查看了：

```yaml
# URL
## Set your site url here. For example, if you use GitHub Page, set url as 'https://username.github.io/project'
url: https://randomnamer.github.io/
root: /StaticBlogTest/
permalink: :year/:month/:day/:title/
permalink_defaults:
pretty_urls:
  trailing_index: true # Set to false to remove trailing 'index.html' from permalinks
  trailing_html: true # Set to false to remove trailing '.html' from permalinks
```

<img src="image-20210930130025608.png"  style="zoom:50%;" />

### 撰写文章

#### Front Matters

Hexo使用markdown写作，或者说，使用Markdown的语法进行写作。Hexo有一种被称为[Front Matter](https://hexo.io/zh-cn/docs/front-matter)的语法，用于对每篇文章进行一定程度上的自定义，如指定网页名称，嵌入封面图，指定文章作者和tag等.

Front Matter可以使用yaml撰写，也可以使用JSON撰写：

```yaml
---
title: Hello World
date: 2013/7/13 20:46:25
---
```

```json
;;;
"title": "Hello World",
"date": "2013/7/13 20:46:25"
;;;
```

#### 与HTML集成

如果用过Typora的话，就会对其中嵌入HTML标签的功能印象深刻，他可以让Markdown文档呈现出不属于Markdown规范的丰富样式，甚至可以通过iframe嵌入其他网页的内容。

<img src="image-20210930143453754.png" style="zoom:50%;" />

Hexo也完全支持内嵌HTML，这样文章不仅可以有着丰富的自定义能力，也可以与Typora完全兼容。

#### 本地撰写实践

Hexo-cli提供了创建新文章的方式：

```shell
➜  StaticBlogTest git:(develop) ✗ hexo new ArticleTest
INFO  Validating config
INFO  Created: ~/Documents/GitHub/StaticBlogTest/source/_posts/ArticleTest.md
```

默认状态下，它只会在指定文件夹下创建一个markdown文件。我们可以用任何markdown编辑器进行撰写，也可以将已经撰写的markdown文件拷贝到`source/_posts`路径下，形成一篇新的文章。

在撰写完成之后，可以用`hexo clean && hexo s`进行预览

## 使用主题

前端的魅力在于更便捷更自由地设计自己想要的外观，Hexo也有着丰富的自定义主题，并且也可以自己开发定制主题。

在Github上和Hexo官网上都有大量的主题

<img src="image-20210930130535951.png" style="zoom:33%;" />

只需要主题下载到`themes`文件夹下，在`_config.yml`中引用这个主题的名字（文件夹名）就可以使用这个主题。不同的主题提供了丰富的配置项目，可以对其进行进一步定制。同时，所有的主题也都是使用标准前端技术构建的，也可以自己对主题进行修改和定制。

比如我这里使用的主题[Fluid](https://github.com/fluid-dev/hexo-theme-fluid)，其文章页的目录就只能居右，通过对它的模版进行修改，可以自定义布局，在左边显示目录，同时使正文不强制居中(space-evenly)。

## 总结
几个小时下来，Hexo这个静态博客生成框架还是给了我不少惊喜，首先就是文章撰写十分容易，可以直接在熟悉的Typora上完成，Front—Matter也让我可以实现对文章样式的控制。几年来全球各地开发者贡献的的模版和插件也数不胜数，很多都让人眼前一亮。

## 测试
列表项目
- 列表1
- 列表2 
- 哈哈哈



