---
auto_translation: true
title: "Save My Kindle: Make EPUBs with JS"
date: 2022-04-24 14:44:06
tags: [JS, Web, Android]
index_img: assets/img/bookday.jpg
excerpt: "Decomplied DMZJ's APK, extracted its API, saved these books from their unreadable app." 
project_link: "https://github.com/RandomNamer/dmzj-reimagine"
---

# data source

Looking at the client of DMZJ (a Chinese website for manga & novel) has long been unhappy, it is better to bully this APK while is not confuscated enough, and use their API to play with myself. With the idea of ​​resurrecting my seven-year-old Kindle, this time I will catch an anime one. Home light novel source, make it an e-book for it to read (why don't you catch comics? Don't ask is today's World Book Day). Although Anime Home has a lot of Chinese light novel resources, its mobile reading experience is not flattering, and the full-screen advertisements on the web basically cut off the possibility of reading with the slow and stuck browser of Kindle. The original idea is to host a web page locally and make a static reading page suitable for the Kindle browser through the DMZJ API (for performance reasons, it is best to directly disable the JavaScript of the Kindle browser). So I quickly thought that since the API is already available, wouldn't it be beautiful to just pick it up and make an e-book and send it over? Anyway, everything is difficult at the beginning, as long as you get the API, the rest of the client, the web or the local storage can be easily at your fingertips. Of course, judging from the demise history of several versions of DMZJ clients that I have witnessed on the Windows UWP side, their APIs still change frequently, so it is better to store them locally.

As mentioned earlier, DMZJ's API has been crawled at least a few years ago, so there have been numerous third-party API-based clients, and there are still APIs available on GitHub in 2021. But unfortunately, the results of the packet capture now show that the previous API is outdated, at least in the comic/novel chapter section, DMZJ's API has introduced new encryption. <img src="image-20220424174404514.png" alt="image-20220424174404514" style="zoom:50%;" />

<img src="image-20220424161305785.png" alt="image-20220424161305785" style="zoom: 50%;" />

So sacrificed `jadx`, directly decompiled to see its novel details page `NovelInstructionActivity` source code. We can see that the basic information interface of the novel is encrypted.

```java
private void refresh(boolean z) {
        this.mNovelProtocol.setPathParam(this.intent_extra_nid);
        AppBeanFunctionUtils.setCommentRequestException(getActivity(), this.mNovelProtocol);
        MyNetClient.getInstance().getNovel(this.intent_extra_nid, new MyCallBack1(getActivity(), new MyCallBack1.B() {
            /* class com.dmzj.manhua.ui.NovelInstructionActivity.AnonymousClass1 */

            @Override // com.dmzj.manhua.net.MyCallBack1.B
            public void onReceiveData(String str) {
                NovelInstructionActivity.this.scrollview.onRefreshComplete();
                try {
                    byte[] decryptWithPrivateKeyBlock = RSAUtil.decryptWithPrivateKeyBlock(str);
                    JsonFormat jsonFormat = new JsonFormat();
                    Novel.NovelInfoResponse parseFrom = Novel.NovelInfoResponse.parseFrom(decryptWithPrivateKeyBlock);
                    if (parseFrom.getErrno() == 0) {
                        final String printToString = jsonFormat.printToString((Message) parseFrom.getDataOrBuilder());
                        NovelInstructionActivity.this.getDefaultHandler().postDelayed(new Runnable() {
                            /* class com.dmzj.manhua.ui.NovelInstructionActivity.AnonymousClass1.AnonymousClass1 */

                            public void run() {
                                NovelInstructionActivity.this.refreshBasicInfos(printToString);
                            }
                        }, 500);
                    } else {
                        UIUtils.show(NovelInstructionActivity.this.getActivity(), parseFrom.getErrmsg());
                    }
                    NovelInstructionActivity.this.ltUnionADPlatform = BrowseAdHelper.setAd(NovelInstructionActivity.this.getActivity(), NovelInstructionActivity.this.layout_ad_layout, 2);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            @Override // com.dmzj.manhua.net.MyCallBack1.B
            public void onReceiveError(String str, int i) {
                NovelInstructionActivity.this.scrollview.onRefreshComplete();
            }
        }));
```

Then we look at its `RSAUtil`, the private key is in plaintext, you know.

Simply call it and find that the previously captured request can be decoded normally, and the content should be protobuf.

```kotlin
object DMZJDecrypter {
    fun run(ciphertext: String){
        println(
            String(RSAUtils.decryptWithPrivateKeyBlock(ciphertext))
        )
    }
}
```

![image-20220424174218724](image-20220424174218724.png)

Use `protoc --decode_raw < ~/Downloads/dmzj_resp.bin > ~/Downloads/dmzj_resp.txt` to decode, you can see the following structure:

<img src="image-20220424185604656.png" alt="image-20220424185604656" style="zoom:50%;" />

But we also need to find the meaning of these fields. In the apk, we can see three ProtoBuf entity classes generated by `protoc`:

<img src="image-20220424185144983.png" alt="image-20220424185144983" style="zoom:50%;" />

For example, the Novel type corresponds to three objects NovelChapter, NovelInfo, NovelVolume, and their definitions are similar:

```java
private NovelInfo() {
            this.memoizedIsInitialized = -1;
            this.novelId_ = 0;
            this.name_ = "";
            this.zone_ = "";
            this.status_ = "";
            this.lastUpdateVolumeName_ = "";
            this.lastUpdateChapterName_ = "";
            this.lastUpdateVolumeId_ = 0;
            this.lastUpdateChapterId_ = 0;
            this.lastUpdateTime_ = 0;
            this.cover_ = "";
            this.hotHits_ = 0;
            this.introduction_ = "";
            this.types_ = LazyStringArrayList.EMPTY;
            this.authors_ = "";
            this.firstLetter_ = "";
            this.subscribeNum_ = 0;
            this.redisUpdateTime_ = 0;
            this.volume_ = Collections.emptyList();
        }
```

Apparently this corresponds to the structure of protobuf. At this point we can finally use the new version of the DMZJ API.

The following is the Protobuf IDL example of the DMZJ light novel I summarized:

```idl
syntax = "proto2";

package novel;

message NovelChapterDetail {
    required int32 chapterId = 1;
    required string chapterName = 2;
    required int32 chapterOrder = 3; 
}

message NovelVolumeDetail {
    required int32 volumeId = 1;
    required string volumeName = 2;
    required int32 volumeOrder = 3;
    repeated NovelChapterDetail chapters = 4;
}

message NovelChapterResponse {
    optional int32 errno = 1;
    optional string errmsg = 2;
    repeated NovelVolumeDetail data = 3;
}

message NovelInfoResponse {
    optional int32 errno = 1;
    optional string errmsg = 2;
    repeated NovelInfo data = 3;
}


message NovelVolume {
    required int32 volumeId = 1;
    required int32 novelId = 2;
    required string volumeName = 3;
    required int32 volumeOrder = 4;
    required uint64 addtime = 5;
    required uint32 sumChapters = 6;
}

message NovelInfo {
    required int32 novelId = 1;
    required string name = 2;
    required string zone = 3;
    required string status = 4;
    required string lastUpdateVolumeName = 5 ;
    required string lastUpdateChapterName = 6;
    required int32 lastUpdateVolumeId = 7;
    required int32 lastUpdateChapterId = 8;
    required uint64 lastUpdateTime = 9;
    required string cover = 10;
    required int32 hotHits = 11;
    required string introduction = 12;
    repeated string types = 13;
    required string authors = 14;
    required string firstLetter = 15;
    required int32 subscribeNum = 16;
    optional uint64 redisUpdateTime = 17; 
    repeated NovelVolume volume = 18;
}

```

Simply decode it with `protobuf.js` to get the directory we want:

![image-20220425000148505](image-20220425000148505.png)

Of course, there is the last step to get the text of the corresponding chapter. This interface needs to be accessed with the `volumeId` and `chapterId` obtained in the previous step and the two queries `t` and `k`: `http://jurisdiction.muwai .com/lnovel/${volumeId}_${chapterId}.txt`.

<img src="image-20220425120102467.png" alt="image-20220425120102467" style="zoom:50%;" />

As the name suggests, `t` is the current timestamp, and `k` should be a random ID generated based on the timestamp, changing any of them, or not uploading will result in a 403.

<img src="image-20220425120229409.png" alt="image-20220425120229409" style="zoom:50%;" />

Decompile `NovelBrowsActivity`, you can see the logic of chapter refresh:

```java
final NovelDescription.Chapter chapter = this.novelChapters.get(z ? i - 1 : i + 1);
        loadChapterNovel(null, chapter.getChapter_name(), this.intent_extra_nid, chapter.getVolume_id(), chapter.getChapter_id(), new OnCommenCompleteListener() {
            /* class com.dmzj.manhua.ui.NovelBrowseActivity.AnonymousClass8 */

            @Override // com.dmzj.manhua.ui.NovelBrowseActivity.OnCommenCompleteListener
            public void onComplete(Bundle bundle) {
                ...
            }
        }, false, z);
```

In the `loadChapterNovel` method, we can see the method `MyspUtils` that splices out the final URL, this is just a tool for taking SahredPreference, it will take the cache address of the corresponding URL from SahredPreference, and then load it locally:

```java
public void loadChapterNovel(final ReadHistory4Novel readHistory4Novel, String str, String str2, String str3, String str4, final OnCommenCompleteListener onCommenCompleteListener, final boolean z, final boolean z2) {
        int i = 0;
        String str5 = new URLPathMaker(this.ctx, URLPathMaker.URL_ENUM.HttpUrlTypeNovelDownLoad).get_url(URLPathMaker.URL_ENUM.HttpUrlTypeNovelDownLoad, str3 + "_" + str4);
        KLog.log("小说地址", str5);
        String str6 = MyspUtils.getStr(this.ctx, str5);
        KLog.log("str", str6);
        if (ZzTool.isNoEmpty(str6) && onCommenCompleteListener != null) {...}
  			 this.mNovelHelper.getLocalLocalFile(getActivity(), str2, str3, str4, new NovelHelper.OnLoadCompleteListener() {
            @Override // com.dmzj.manhua.novel.NovelHelper.OnLoadCompleteListener
            public void onComplete(String str, String str2) {...}
         });
}
```

After the cache is not hit, the `NovelHelper.getLocalLocalFile()` method is called (this method will actually perform the download, but the name is... good coding practice). Therefore, the URL made earlier is only used to query the cache, and does not trigger the download behavior in this method.

In `NovelHelper`, we finally see the part of calculating two queries, the key is an MD5 encoding mixed with timestamps.

```java
public static void goWebDownLoad(final StepActivity stepActivity, String str, final String str2, final OnLoadCompleteListener onLoadCompleteListener) {
        if (!AppUtils.RELEASE) {
            Log.d("novel_goWebDownLoad", "webpath = " + str);
        }
        long currentTimeMillis = System.currentTimeMillis() / 1000;
        String replace = str.replace(Api.NOVEL_URL, "");
        StringBuilder sb = new StringBuilder();
        sb.append(str);
        sb.append("?t=");
        sb.append(currentTimeMillis);
        sb.append("&k=");
        sb.append(MD5.MD5Encode(Api.NOVEL_KEY + replace + currentTimeMillis).toLowerCase());
        String sb2 = sb.toString();
        KLog.log("小说地址====", sb2);
  ...
}
```

Now we have a usable query.

<img src="image-20220425134554616.png" alt="image-20220425134554616" style="zoom:50%;" />

# Make an eBook

I have to admit that the recent API revision of DMZJ has indeed brought a lot of trouble to obtaining data. Fortunately, the obfuscation intensity of the client APK is very low, and its encryption logic and interface details can be obtained through decompilation. Now we have a complete data source, including book information (author, cover, region, tag, etc.), bibliographic information (volume, chapter), and the corresponding text for each chapter.

Here I used the npm module `epub-gen` to generate Epub eBooks. Since Epub also applies HTML and CSS typesetting, you only need to provide HTML chapter text and external CSS to generate Epub. The use of [epub-gen](https://www.npmjs.com/package/epub-gen) is quite simple. You only need to specify some options and construct an Epub object from the list of objects in the chapters as the content to complete the e-book. generation. The module can also automatically download the picture in the url as the cover.

The code to generate the Epub eBook from the data structure obtained earlier is as follows:

```javascript
	for (let volume of volumes) {
        for (let chapter of volume.chapters) {
            let text = await getChapterText(volume.volumeId, chapter.chapterId)
            chapter.text = text
        }
        volume.chapters = volume.chapters.sort((a, b) => a.chapterOrder - b.chapterOrder)
    }
    // volumes = volumes.sort((a, b) => a.volumeOrder - b.volumeOrder)
    let volumesStr = JSON.stringify(volumes)
    console.log("Successfully get raw text", volumesStr)
    const workingDir = path.join(outputDir, info.novelId.toString())
    if (!fs.existsSync(workingDir)) {
        fs.mkdirSync(workingDir);
    }
    // fs.writeFileSync(path.join(workingDir, 'volumes.json'), volumesStr, err => {
    //     console.error(err)
    // })

    var content = []
    volumes.forEach(vol => {
        content.push({
            title: vol.volumeName,
            data: ""
        })
        for (let chap of vol.chapters) {
            content.push({
                title: chap.chapterName,
                data: `<div>${chap.text}</div>`
            })
        }
    })

    const options = {
        title: info.name,
        author: info.authors,
        cover: info.cover,
        lang: "zh",
        tocTitle: "目录",
        content: content,
        verbose: true
    }

    return new Epub(options, path.join(workingDir, `${info.name}.epub`))
```

<img src="image-20220425162559469.png" alt="image-20220425162559469" style="zoom:50%;" />

Everything works perfectly...but `epub-gen` doesn't actually support multi-level directories, which means, we get a volume-chapter two-level structure that cannot be generated into an epub..... . But it's not a big problem. First of all, there are some workarounds, such as inserting empty pages in the `data` of the volume, and then adding other chapters; secondly, you can directly modify the `epub-gen`, which is beyond the scope of this article.

