---
auto_translation: true
title: Analysis of DICOM Transfer Protocols
date: 2021-11-11 21:14:06
tags: [DICOM, Biomedical Engineering, Biomedical Imaging, Network]
excerpt:  Yet another course project of Biomedical Engineering.
index_img: assets/img/dcm-header.png
project_link: "https://github.com/RandomNamer/BMECourseDesign"
---

<h2 align='center' style="font-family: serif; font-size: 40px;">DICOM Transfer Protocols Analysis</h2>

> This blog is an excerpt from one of my [course design](https://github.com/RandomNamer/BMECourseDesign) reports.

## 1. Overview

### Introduction to PACS

Image Archiving and Communication System (PACS) is a medical imaging technology that provides functions such as storage, access, and search of images of multiple modalities. The common format for PACS image storage and transmission is DICOM, and PACS itself is part of the DICOM standard. The PACS system consists of Modality, Server and View Station, which can be considered as an implementation of the client/service model. The modal and the viewer belong to the user (Service Class User, SCU), and the server is called the Service Class Provider, abbreviated as SCP.

In implementation, modalities are typically digital imaging devices such as computed tomography (CT), ultrasound, nuclear medicine, positron emission tomography (PET), and magnetic resonance imaging (MRI). The modality can be sent to a quality assurance (QA) workstation first, and if the information is correct, the image will be passed to the server for storage. This step comes from the C-STORE protocol in the DICOM standard. View Station is a place where radiologists review patient research and formulate diagnoses. Its basic function is to perform addition, deletion, and modification operations on the data in the server, which is implemented by C-FIND, C-MOVE, and C-GET in the DICOM standard. In View Station, peripheral facilities such as reporting systems can also be inherited, and integrated with other information systems in the hospital, such as the electronic medical record system EMR, to form an end-to-end workflow.

#### DCMTK

Here we use the DCMTK toolkit as Modality and View Station. DCMTK is a set of open source packages and libraries that implement the DCM standard. It is developed using C++ and is cross-platform. Most of the DICOM standard is implemented in DCMTK, including image opening, conversion and verification functions, and the transmission of DICOM files over the Internet.

This time, DCMTK is built on the macOS system, and the builds on other UNIX-like systems should also have the same steps. The `CMakelist` corresponding to various systems has been written in the DCMTK source code, and you only need to execute `cmake` to complete the configuration. Then `make` in the source file path can build the entire project. After the build is successful, the corresponding static library files and binary executable files will be output:


<img src="image-20210930193320612.png" alt="image-20210930193320612" style="zoom:33%;" />


<img src="image-20210930193338568.png" alt="image-20210930193338568" style="zoom:33%;" />


The output has a set of command line tools and the corresponding static link library, which meets the needs of users to call through system commands and direct link calls, which is very convenient for secondary development. At the same time, we can also directly use the generated command line tools to perform various DICOM operations. For example, we can use the `storescu` as modality to send DICOM files to the server. The format sent is

```shell
storescu [options] peer port dcmfile-in...
```

#### CONQEST SERVER

CONQUEST is a lightweight DICOM SERVER that implements the DIMSE message mechanism and supports multiple databases.



## 2. Image communication and its parameter analysis

### Overview

DICOM is a high-level protocol built on top of TCP/IP. The bottom layer of the DICOM protocol is ULP (Upper Layer Protocol). It is mainly responsible for connecting with TCP. After the DICOM application entity completes the message exchange through DIMSE, the DICOM upper protocol layer ULP is required to provide transmission support.

ULP provides 5 connection control services: A-ASSOCIATE, A-RELEASE, A-ABORT, P-DATA, A-P-ABORT.

- A-ASSOCIATE:
- A-RELEASE:
- A-ABORT:
- P-DATA:
- A-P-ABORT:

ULP provides 7 protocol data units (Protocol Data Unit, PDU) to realize the above-mentioned 5 kinds of services.

- A-ASSOCIATE-RQ:
- A-ASSOCIATE-AC:
- A-ASSOCIATE-RJ:
- P-DATA-TF:
- A-RELEASE-RQ:
- A-RELEASE-RP:
- A-ABORT:

The process of DICOM image transmission can also be inferred from the foregoing: the connection is established through the Association PDU, the actual transmission is performed through the P-DATA-TF PDU, and the connection is released through the Release PDU after the transmission is completed, or A-ABORT is used to terminate the connection during transmission.

The details of the communication will be described below.

### C-STORE

The `-v -d` parameter is used here to enable the command line tool of DCMTK to output detailed logs in Debug mode, and a network packet capture tool can also be used for auxiliary analysis.

<img src="image-20210930194603984.png" alt="image-20210930194603984" style="zoom:50%;" />

The log includes the detailed process of connection establishment, transmission, and completion of the transmission between the two parties, including the request and response information `A-ASSOCIATE-RQ`, `A-ASSOCIATE-AC`, the DIMSE information of the store request and the received information when the connection is established. DIMSE information that the store responds to.

#### connection establishment

In the DICOM standard, the connection request A-ASSOCIATE-RQ is described as follows:

- **PDU
- :------------:
- 1
- 02
- 3-6
- 7-8
- 9-10
- 11-26
- 27-42
- 43-74
- 75-xxx

- 6

After the server receives the request, the server will start to parse the information carried in the request, mainly to check the carried Presentation Context, and will respond when the conditions are met, and then return the ASSOCIATE-AC message, whose structure is defined as follows:

- **PDU
- :------------:
- 1
- 2
- 3-6
- 7-8
- 9-10
- 11-26
- 27-42
- 43-74
- 75-xxx

#### Presentation Context

Presentation Context is a representation in the DICOM protocol that specifies the form of transport supported by the client. It describes in detail the structure and encoding format of the content of this type of fragment. It consists of 3 parts: a Context ID, an Abstract Syntax and multiple Transfer Syntax.

- Positive odd numbers between 255
2. **Abstract Syntax** is the meaning of data representation, usually represented by DICOM SOP Class UID, such as the following two IDs; at the same time, it can also be represented by private ID to realize the transmission of custom image types.
- `1.2.840.10008.1.1`
- `1.2.840.10008.5.1.4.1.1`
3. **Transfer Syntax** is the data encoding format. Usually represented by DICOM Transfer Syntax Class UID, such as the following two IDs; at the same time, it can also be represented by private ID to realize the transfer of custom image types.
- `1.2.840.10008.1.2`
- `1.2.840.10008.1.2.4.50`

The logs of dcmtk can help us to parse the Presentation Context as follows:

```
D:		 Context ID:        45 (Proposed)
D:     Abstract Syntax: =DigitalIntraOralXRayImageStorageForPresentation
D:     Proposed SCP/SCU Role: Default
D:     Proposed Transfer Syntax(es):
D:       =LittleEndianExplicit
```

In the Server, open the Debug mode log, and also print the Presentation Context carried in ASSOCIATE-RQ:

```
[CONQUESTSRV1] UPACS THREAD 45: STARTED AT: Wed Oct 13 18:25:41 2021
[CONQUESTSRV1] A-ASSOCIATE-RQ Packet Dump
[CONQUESTSRV1]  Calling Application Title : "STORESCU        "
[CONQUESTSRV1]  Called Application Title : "ANY-SCP         "
[CONQUESTSRV1]  Application Context : "1.2.840.10008.3.1.1.1", PDU length: 16384
[CONQUESTSRV1]  Number of Proposed Presentation Contexts: 128
[CONQUESTSRV1]  Presentation Context 0 "1.2.840.10008.5.1.4.1.1.9.1.3" 1
[CONQUESTSRV1]  Presentation Context 1 "1.2.840.10008.5.1.4.1.1.9.1.3" 1
...
[CONQUESTSRV1]  Presentation Context 127 "1.2.840.10008.5.1.4.1.1.12.2" 1
[CONQUESTSRV1] Server Command   := 0001
[CONQUESTSRV1] Message ID       := 0001
[CONQUESTSRV1] FreeStore Left 17269 on c:\
[CONQUESTSRV1] Written file: c:\users\admi\desktop\dicomserver150b\data\MF-0000012\1.3.6.1.4.1.5962.1.3.5012.1.1166546115.14677_0001_000001_16341207560000.dcm
[CONQUESTSRV1] UPACS THREAD 45: ENDED AT: Wed Oct 13 18:25:56 2021
[CONQUESTSRV1] UPACS THREAD 45: TOTAL RUNNING TIME: 15 SECONDS
```

#### DIMSE

DIMSE (DICOM Message Service Element) is a message format transmitted under P-DATA PDU. There are 11 DIMSE services in the DICOM3.0 protocol:

- **Name**
- --------------
| C-STORE        | DIMSE-C   | operation    |
| C-GET          | DIMSE-C   | operation    |
| C-MOVE         | DIMSE-C   | operation    |
| C-FIND         | DIMSE-C   | operation    |
| C-ECHO         | DIMSE-C   | operation    |
| N-EVENT-REPORT | DIMSE-N   | notification |
| N-GET          | DIMSE-N   | operation    |
| N-SET          | DIMSE-N   | operation    |
| N-ACTION       | DIMSE-N   | operation    |
| N-CREATE       | DIMSE-N   | operation    |
| N-DELETE       | DIMSE-N   | operation    |

这里还是以C-STORE为例进行分析。在收到服务端返回的ASSOCIATE-AC报文后，就正式发起store请求，进行传输。日志种会输出本次传输的DIMSE信息。

```
D: ===================== OUTGOING DIMSE MESSAGE ====================
D: Message Type                  : C-STORE RQ
D: Message ID                    : 1
D: Affected SOP Class UID        : SecondaryCaptureImageStorage
D: Affected SOP Instance UID     : 1.3.6.1.4.1.5962.99.1.2280943358.716200484.1363785608958.60.0
D: Data Set                      : present
D: Priority                      : medium
D: ======================= END DIMSE MESSAGE =======================
D: DcmDataset::read() TransferSyntax="Little Endian Implicit"
I: Received Store Response
D: ===================== INCOMING DIMSE MESSAGE ====================
D: Message Type                  : C-STORE RSP
D: Presentation Context ID       : 203
D: Message ID Being Responded To : 1
D: Affected SOP Class UID        : SecondaryCaptureImageStorage
D: Affected SOP Instance UID     : 1.3.6.1.4.1.5962.99.1.2280943358.716200484.1363785608958.60.0
D: Data Set                      : none
D: DIMSE Status                  : 0x0000: Success
D: ======================= END DIMSE MESSAGE =======================
```

在传输完成后，即可在服务端数据库看到这个图像，说明传输已经成功。

<img src="image-20211013183425277.png" alt="image-20211013183425277" style="zoom:50%;" />

#### 传输

DIMSE传输与DICOM图像传输都是用P-DATA PDU，这里通过抓包软件对它们进行分析。

在A-ASSOCIATE AC消息之后，两者开始通过P-DATA PDU进行传输。首先我们可以看到C-STORE RQ这一DIMSE消息的报文。其信息内容与之前日志输出的完全一致。

<img src="image-20211013183453881.png" alt="image-20211013183453881" style="zoom:50%;" />

然后我们可以看到DCM文件被实际传输。PDV长度为32768B（32KB），实际上由24个长度为1514字节的TCP帧构成。传输的内容是小端序，未压缩，无加密。

<img src="image-20211013183507932.png" alt="image-20211013183507932" style="zoom:50%;" />

### C-FIND

#### Information Model

在DICOM标准中，查询/取回的信息模型有以下三种：

- Patient Root
- Study Root
- Patient/Study Only

例如，在患者根模型中，有四种层级的分类：

- Patient：对应Patient Information Entity (IE)
- Study：对应一个患者和Study IE
- Series：Series依赖具体的modality，在一个study中。它对应着Series, Frame of Reference 和Equipment IE。
- Composite Object Instance：对应Composite Object IE。

#### 查询

C-FIND查询使用Key- Value进行，查询在SCP中会被转换为对应的SQL语句，向数据库发起查询。

|          **描述/模块**          |    **标签**    | **匹配密钥类型** | **返回密钥类型** |                      **备注/匹配类型**                       |
| :-----------------------------: | :------------: | :--------------: | :--------------: | :----------------------------------------------------------: |
|            病人姓名             | （0010,0010）  |        —         |        1         |                                                              |
|             患者ID              | （0010,0020）  |        R         |        1         | 请求标识符中应显示。应使用单值匹配检索。注意由于预计只有一个响应，这是一个唯一的密钥。 |
|         患者ID的发行人          | （0010,0021）  |        R         |        2         | 应使用单值匹配检索。在有多个发行商的情况下，此密钥限制将患者ID（0010,0020）与患者ID（0010,0020）唯一域匹配。 |
|         患者的出生日期          | （0010,0030）  |        —         |        2         |                                                              |
|           患者的性别            | （0010,0040）  |        —         |        2         |                                                              |
|   患者识别模块的所有其他属性    |                |        —         |        3         |                                                              |
| 患者人口统计模块的所有其他属性  |                |        —         |        3         |                                                              |
|          观察日期时间           | （0040，A032） |        —         |        1         |                                                              |
|             值类型              | （0040，A040） |        —         |        1         |                应与（0040，A043）的第一行相同                |
|        概念名称代码序列         | （0040，A043） |        —         |        1         | 请求中不应存在，响应中用应与标识符中内容模板序列（0040，A504）中标识的模板相同。 |
|             >代码值             | （0008,0100）  |        —         |        1         |                                                              |
|          >编码方案指示          | （0008,0102）  |        —         |        1         |                                                              |
|          >编码方案版本          | （0008,0103）  |        —         |        1C        | 如果编码方案指示（0008,0102）的值不足以明确识别代码值（0008,0100），则为必填项。 |
|            >代码含义            | （0008,0104）  |        —         |        1         |                                                              |
| >概念名称代码序列的所有其他属性 |                |                  |                  |                                                              |
|            内容序列             | （0040，A730） |        —         |        2         | 内容序列（0040，A730）是一个潜在的递归嵌套项目序列。内容序列应始终在请求标识符中发送零长度。响应数据集中的内容序列应包含所请求模板的内容项。 |
|       >内容序列的所有属性       |                |        —         |        —         | SCP提供的内容项目。对内容项属性类型的要求应符合SR文档内容模块中的定义。 |
|      HL7结构化文档参考序列      | （0040，A390） |        —         |        1C        |                                                              |
|         >参考的SOP类UID         | （0008,1150）  |        —         |        1         |                                                              |
|        >引用的SOP实例UID        | （0008,1155）  |        —         |        1         |                                                              |
|         >HL7实例标识符          | （0040，E001） |        —         |        1         |                                                              |
|            >检索URI             | （0040，E010） |        —         |        3         |                                                              |
|   包含其他参考实例序列的研究    | （0008,1200）  |        —         |        1C        | 如果内容序列（0040，A390）包含引用使用患者/研究/系列/实例信息模型的SOP实例的内容项，则为必填项。 |
|          >引用系列序列          | （0008,1115）  |        —         |        1         |                                                              |
|          >>系列实例UID          | （0020,000E）  |        —         |        1         |                                                              |
|         >>引用实例序列          | （0008,114A）  |        —         |        1         |                                                              |
|         >>>参考SOP类UID         | （0008,1150）  |        —         |        1         |                                                              |
|       >>>引用的SOP实例UID       | （0008,1155）  |        —         |        1         |                                                              |

#### 日志分析

C-FIND也同样遵循上述的流程，即先通过Association PDU建立连接，通过P-DATA-TF PDU进行实际传输，传输完成后通过Release PDU进行连接释放。我们试验查询上一次写入的DCM文件：

```shell
➜  ~ findscu -v -d -S -k "(0008, 0052)=STUDY" -k "(0010,0020)=Case1" 59.78.44.209 5678
D: $dcmtk: findscu v3.6.6 2021-01-14 $
D: 
D: DcmDataDictionary: Loading file: /usr/local/Cellar/dcmtk/3.6.6/share/dcmtk/dicom.dic
D: Request Parameters:
D: ====================== BEGIN A-ASSOCIATE-RQ =====================
D: Our Implementation Class UID:      1.2.276.0.7230010.3.0.3.6.6
D: Our Implementation Version Name:   OFFIS_DCMTK_366
D: Their Implementation Class UID:    
D: Their Implementation Version Name: 
D: Application Context Name:    1.2.840.10008.3.1.1.1
D: Calling Application Name:    FINDSCU
D: Called Application Name:     ANY-SCP
D: Responding Application Name: ANY-SCP
D: Our Max PDU Receive Size:    16384
D: Their Max PDU Receive Size:  0
D: Presentation Contexts:
D:   Context ID:        1 (Proposed)
D:     Abstract Syntax: =FINDStudyRootQueryRetrieveInformationModel
D:     Proposed SCP/SCU Role: Default
D:     Proposed Transfer Syntax(es):
D:       =LittleEndianExplicit
D:       =BigEndianExplicit
D:       =LittleEndianImplicit
D: Requested Extended Negotiation: none
D: Accepted Extended Negotiation:  none
D: Requested User Identity Negotiation: none
D: User Identity Negotiation Response:  none
D: ======================= END A-ASSOCIATE-RQ ======================
```

在ASSOCIATE-RQ中，我们可以看到它携带了一个Presentation Context，表示这个是一个StudyRoot的Information Model。对方只要支持这一种Infromation Model即可完成连接。

在DICOM 3.0中，C-FIND-RQ协议规定如下：

|   **Message Field**    |                   **Description of Field**                   |
| :--------------------: | :----------------------------------------------------------: |
- Command
- Affected
- Command
- Message
- Priority
- Command
- Identifier

```
I: Requesting Association
D: setting network send timeout to 60 seconds
D: setting network receive timeout to 60 seconds
D: Constructing Associate RQ PDU
D: PDU Type: Associate Accept, PDU Length: 187 + 6 bytes PDU header
D:   02  00  00  00  00  bb  00  01  00  00  41  4e  59  2d  53  43
D:   50  20  20  20  20  20  20  20  20  20  46  49  4e  44  53  43
D:   55  20  20  20  20  20  20  20  20  20  00  00  00  00  00  00
D:   00  00  00  00  00  00  00  00  00  00  00  00  00  00  00  00
D:   00  00  00  00  00  00  00  00  00  00  10  00  00  15  31  2e
D:   32  2e  38  34  30  2e  31  30  30  30  38  2e  33  2e  31  2e
D:   31  2e  31  21  00  00  19  01  00  00  00  40  00  00  11  31
D:   2e  32  2e  38  34  30  2e  31  30  30  30  38  2e  31  2e  32
D:   50  00  00  3d  51  00  00  04  00  00  80  00  52  00  00  22
D:   31  2e  32  2e  38  32  36  2e  30  2e  31  2e  33  36  38  30
D:   30  34  33  2e  32  2e  31  33  35  2e  31  30  36  36  2e  31
D:   30  31  55  00  00  0b  31  2e  35  2e  30  2f  57  49  4e  33
D:   32
D: Parsing an A-ASSOCIATE PDU
D: Association Parameters Negotiated:
D: ====================== BEGIN A-ASSOCIATE-AC =====================
D: Our Implementation Class UID:      1.2.276.0.7230010.3.0.3.6.6
D: Our Implementation Version Name:   OFFIS_DCMTK_366
D: Their Implementation Class UID:    1.2.826.0.1.3680043.2.135.1066.101
D: Their Implementation Version Name: 1.5.0/WIN32
D: Application Context Name:    1.2.840.10008.3.1.1.1
D: Calling Application Name:    FINDSCU
D: Called Application Name:     ANY-SCP
D: Responding Application Name: ANY-SCP
D: Our Max PDU Receive Size:    16384
D: Their Max PDU Receive Size:  32768
D: Presentation Contexts:
D:   Context ID:        1 (Accepted)
D:     Abstract Syntax: =FINDStudyRootQueryRetrieveInformationModel
D:     Proposed SCP/SCU Role: Default
D:     Accepted SCP/SCU Role: Default
D:     Accepted Transfer Syntax: =LittleEndianImplicit
D: Requested Extended Negotiation: none
D: Accepted Extended Negotiation:  none
D: Requested User Identity Negotiation: none
D: User Identity Negotiation Response:  none
D: ======================= END A-ASSOCIATE-AC ======================
```

The other party will respond and the connection will be established.

Then the DIMSE message is sent at the P-DATA layer. It can be seen that the DIMSE message mainly contains this SOP, which is the Information Model of the StudyRoot query, and also carries two Query.

```
I: Association Accepted (Max Send PDV: 32756)
I: Sending Find Request
D: ===================== OUTGOING DIMSE MESSAGE ====================
D: Message Type                  : C-FIND RQ
D: Presentation Context ID       : 1
D: Message ID                    : 1
D: Affected SOP Class UID        : FINDStudyRootQueryRetrieveInformationModel
D: Data Set                      : present
D: Priority                      : medium
D: ======================= END DIMSE MESSAGE =======================
I: Request Identifiers:
I: 
I: # Dicom-Data-Set
I: # Used TransferSyntax: Little Endian Explicit
I: (0008,0052) CS [STUDY]                                  #   6, 1 QueryRetrieveLevel
I: (0010,0020) LO [Case1]                                  #   6, 1 PatientID
I: 
D: DcmDataset::read() TransferSyntax="Little Endian Implicit"
D: DcmDataset::read() TransferSyntax="Little Endian Implicit"
```

On the server side, we can check the log to determine the operation mode of the query:

```
[CONQUESTSRV1] UPACS THREAD 46: STARTED AT: Wed Oct 13 19:36:59 2021
[CONQUESTSRV1] A-ASSOCIATE-RQ Packet Dump
[CONQUESTSRV1]  Calling Application Title : "FINDSCU         "
[CONQUESTSRV1]  Called Application Title : "ANY-SCP         "
[CONQUESTSRV1]  Application Context : "1.2.840.10008.3.1.1.1", PDU length: 16384
[CONQUESTSRV1]  Number of Proposed Presentation Contexts: 1
[CONQUESTSRV1]  Presentation Context 0 "1.2.840.10008.5.1.4.1.2.2.1" 1
[CONQUESTSRV1] Server Command   := 0020
[CONQUESTSRV1] Message ID       := 0001
[CONQUESTSRV1] (StudyRootQuery) search level: STUDY 
[CONQUESTSRV1] Query On Study
[CONQUESTSRV1] Issue Query on Columns: DICOMStudies.PatientID
[CONQUESTSRV1] Values: DICOMStudies.PatientID = 'Case1'
[CONQUESTSRV1] Tables: DICOMStudies
[CONQUESTSRV1] Sorting ((null)) DoSort := 0
[CONQUESTSRV1] Records = 1
[CONQUESTSRV1] C-Find (StudyRoot) located 1 records
[CONQUESTSRV1] UPACS THREAD 46: ENDED AT: Wed Oct 13 19:36:59 2021
[CONQUESTSRV1] UPACS THREAD 46: TOTAL RUNNING TIME: 0 SECONDS
```

It can be seen that the server first determines to start the query from Study as the root node, and then starts the query in the PatientID column just specified, finds a record, and then sends a response. The following is the response content parsed by SCU:

```
I: Received Find Response 1
D: ===================== INCOMING DIMSE MESSAGE ====================
D: Message Type                  : C-FIND RSP
D: Message ID Being Responded To : 1
D: Affected SOP Class UID        : FINDStudyRootQueryRetrieveInformationModel
D: Data Set                      : present
D: DIMSE Status                  : 0xff00: Pending: Matches are continuing
D: ======================= END DIMSE MESSAGE =======================
D: Response Identifiers:
D: 
D: # Dicom-Data-Set
D: # Used TransferSyntax: Little Endian Implicit
D: (0008,0052) CS [STUDY ]                                 #   6, 1 QueryRetrieveLevel
D: (0010,0020) LO [Case1 ]                                 #   6, 1 PatientID
D: 
D: DcmDataset::read() TransferSyntax="Little Endian Implicit"
I: Received Final Find Response
D: ===================== INCOMING DIMSE MESSAGE ====================
D: Message Type                  : C-FIND RSP
D: Message ID Being Responded To : 1
D: Affected SOP Class UID        : FINDStudyRootQueryRetrieveInformationModel
D: Data Set                      : none
D: DIMSE Status                  : 0x0000: Success: Matching is complete
D: ======================= END DIMSE MESSAGE =======================
I: Releasing Association
```

### C-MOVE

C-MOVE can be understood that after C-FIND query, the SCP of C-MOVE initiates a C-STORE request to the SCU, and finally transmits the image to the SCU of C-MOVE.

From the analysis of the packet capture software, it can be seen that the SCU first transmits C-MOVE DIMSE to the SCP, and the other party sends a connection request in turn after receiving it.

<img src="image-20211013231631533.png" alt="image-20211013231631533" style="zoom:50%;" />

After the C-STORE transmission is completed (the PDU side sends a C-STORE RSP), the other party will send a C-MOVE response. After all sub-C-STORE operations are completed, a total C-STORE response will be sent, and both parties will start Disconnect.

<img src="image-20211013231904790.png" alt="image-20211013231904790" style="zoom:50%;" />

#### log analysis

The first is that the SCU requests the SCP to establish a connection:

```shell
➜  ~ movescu -v -d -aem "DCMTK" --port 7777 -k 0008,0052=STUDY -k 0010,0020="Case1" 59.78.44.209 5678
D: DcmDataDictionary: Loading file: /usr/local/Cellar/dcmtk/3.6.6/share/dcmtk/dicom.dic
D: $dcmtk: movescu v3.6.6 2021-01-14 $
D: 
D: Request Parameters:
D: ====================== BEGIN A-ASSOCIATE-RQ =====================
D: Our Implementation Class UID:      1.2.276.0.7230010.3.0.3.6.6
D: Our Implementation Version Name:   OFFIS_DCMTK_366
D: Their Implementation Class UID:    
D: Their Implementation Version Name: 
D: Application Context Name:    1.2.840.10008.3.1.1.1
D: Calling Application Name:    MOVESCU
D: Called Application Name:     ANY-SCP
D: Responding Application Name: ANY-SCP
D: Our Max PDU Receive Size:    16384
D: Their Max PDU Receive Size:  0
D: Presentation Contexts:
D:   Context ID:        1 (Proposed)
D:     Abstract Syntax: =FINDPatientRootQueryRetrieveInformationModel
D:     Proposed SCP/SCU Role: Default
D:     Proposed Transfer Syntax(es):
D:       =LittleEndianExplicit
D:       =BigEndianExplicit
D:       =LittleEndianImplicit
D:   Context ID:        3 (Proposed)
D:     Abstract Syntax: =MOVEPatientRootQueryRetrieveInformationModel
D:     Proposed SCP/SCU Role: Default
D:     Proposed Transfer Syntax(es):
D:       =LittleEndianExplicit
D:       =BigEndianExplicit
D:       =LittleEndianImplicit
D: Requested Extended Negotiation: none
D: Accepted Extended Negotiation:  none
D: Requested User Identity Negotiation: none
D: User Identity Negotiation Response:  none
D: ======================= END A-ASSOCIATE-RQ ======================
I: Requesting Association
D: setting network send timeout to 60 seconds
D: setting network receive timeout to 60 seconds
D: Constructing Associate RQ PDU
D: PDU Type: Associate Accept, PDU Length: 216 + 6 bytes PDU header
D:   02  00  00  00  00  d8  00  01  00  00  41  4e  59  2d  53  43
D:   50  20  20  20  20  20  20  20  20  20  4d  4f  56  45  53  43
D:   55  20  20  20  20  20  20  20  20  20  00  00  00  00  00  00
D:   00  00  00  00  00  00  00  00  00  00  00  00  00  00  00  00
D:   00  00  00  00  00  00  00  00  00  00  10  00  00  15  31  2e
D:   32  2e  38  34  30  2e  31  30  30  30  38  2e  33  2e  31  2e
D:   31  2e  31  21  00  00  19  01  00  00  00  40  00  00  11  31
D:   2e  32  2e  38  34  30  2e  31  30  30  30  38  2e  31  2e  32
D:   21  00  00  19  03  00  00  00  40  00  00  11  31  2e  32  2e
D:   38  34  30  2e  31  30  30  30  38  2e  31  2e  32  50  00  00
D:   3d  51  00  00  04  00  00  80  00  52  00  00  22  31  2e  32
D:   2e  38  32  36  2e  30  2e  31  2e  33  36  38  30  30  34  33
D:   2e  32  2e  31  33  35  2e  31  30  36  36  2e  31  30  31  55
D:   00  00  0b  31  2e  35  2e  30  2f  57  49  4e  33  32
D: Parsing an A-ASSOCIATE PDU
D: Association Parameters Negotiated:
D: ====================== BEGIN A-ASSOCIATE-AC =====================
D: Our Implementation Class UID:      1.2.276.0.7230010.3.0.3.6.6
D: Our Implementation Version Name:   OFFIS_DCMTK_366
D: Their Implementation Class UID:    1.2.826.0.1.3680043.2.135.1066.101
D: Their Implementation Version Name: 1.5.0/WIN32
D: Application Context Name:    1.2.840.10008.3.1.1.1
D: Calling Application Name:    MOVESCU
D: Called Application Name:     ANY-SCP
D: Responding Application Name: ANY-SCP
D: Our Max PDU Receive Size:    16384
D: Their Max PDU Receive Size:  32768
D: Presentation Contexts:
D:   Context ID:        1 (Accepted)
D:     Abstract Syntax: =FINDPatientRootQueryRetrieveInformationModel
D:     Proposed SCP/SCU Role: Default
D:     Accepted SCP/SCU Role: Default
D:     Accepted Transfer Syntax: =LittleEndianImplicit
D:   Context ID:        3 (Accepted)
D:     Abstract Syntax: =MOVEPatientRootQueryRetrieveInformationModel
D:     Proposed SCP/SCU Role: Default
D:     Accepted SCP/SCU Role: Default
D:     Accepted Transfer Syntax: =LittleEndianImplicit
D: Requested Extended Negotiation: none
D: Accepted Extended Negotiation:  none
D: Requested User Identity Negotiation: none
D: User Identity Negotiation Response:  none
D: ======================= END A-ASSOCIATE-AC ======================
I: Association Accepted (Max Send PDV: 32756)
```

After that, the C-MOVE request is sent using the P-DATA PDU. It can be seen that the C-MOVE message format is similar to C-FIND.

```
I: Sending Move Request
D: ===================== OUTGOING DIMSE MESSAGE ====================
D: Message Type                  : C-MOVE RQ
D: Presentation Context ID       : 3
D: Message ID                    : 1
D: Affected SOP Class UID        : MOVEPatientRootQueryRetrieveInformationModel
D: Data Set                      : present
D: Priority                      : medium
D: Move Destination              : DCMTK
D: ======================= END DIMSE MESSAGE =======================
I: Request Identifiers:
I: 
I: # Dicom-Data-Set
I: # Used TransferSyntax: Little Endian Explicit
I: (0008,0052) CS [STUDY]                                  #   6, 1 QueryRetrieveLevel
I: (0010,0020) LO [Case1]                                  #   6, 1 PatientID
```

After processing the C-MOVE request on the SCP side, a connection request is initiated to the SCU. This request contains a `SecondaryCaptureImageStorage` Presentation Context, which is also consistent with the C-MOVE connection request mentioned earlier. You can see that the called application name sent by the other party is the name specified in the `-aem` parameter.

```
I: 
D: Association Received: 59
D: setting network send timeout to 60 seconds
D: setting network receive timeout to 60 seconds
D: PDU Type: Associate Request, PDU Length: 216 + 6 bytes PDU header
D:   01  00  00  00  00  d8  00  01  00  00  44  43  4d  54  4b  20
D:   20  20  20  20  20  20  20  20  20  20  43  4f  4e  51  55  45
D:   53  54  53  52  56  31  20  20  20  20  00  00  00  00  00  00
D:   00  00  00  00  00  00  00  00  00  00  00  00  00  00  00  00
D:   00  00  00  00  00  00  00  00  00  00  10  00  00  15  31  2e
D:   32  2e  38  34  30  2e  31  30  30  30  38  2e  33  2e  31  2e
D:   31  2e  31  20  00  00  36  77  00  00  00  30  00  00  19  31
D:   2e  32  2e  38  34  30  2e  31  30  30  30  38  2e  35  2e  31
D:   2e  34  2e  31  2e  31  2e  37  40  00  00  11  31  2e  32  2e
D:   38  34  30  2e  31  30  30  30  38  2e  31  2e  32  50  00  00
D:   3d  51  00  00  04  00  00  80  00  52  00  00  22  31  2e  32
D:   2e  38  32  36  2e  30  2e  31  2e  33  36  38  30  30  34  33
D:   2e  32  2e  31  33  35  2e  31  30  36  36  2e  31  30  31  55
D:   00  00  0b  31  2e  35  2e  30  2f  57  49  4e  33  32
D: Parsing an A-ASSOCIATE PDU
I: Sub-Association Received
D: Parameters:
D: ====================== BEGIN A-ASSOCIATE-RQ =====================
D: Our Implementation Class UID:      1.2.276.0.7230010.3.0.3.6.6
D: Our Implementation Version Name:   OFFIS_DCMTK_366
D: Their Implementation Class UID:    1.2.826.0.1.3680043.2.135.1066.101
D: Their Implementation Version Name: 1.5.0/WIN32
D: Application Context Name:    1.2.840.10008.3.1.1.1
D: Calling Application Name:    CONQUESTSRV1
D: Called Application Name:     DCMTK
D: Responding Application Name: 
D: Our Max PDU Receive Size:    16384
D: Their Max PDU Receive Size:  32768
D: Presentation Contexts:
D:   Context ID:        119 (Proposed)
D:     Abstract Syntax: =SecondaryCaptureImageStorage
D:     Proposed SCP/SCU Role: Default
D:     Proposed Transfer Syntax(es):
D:       =LittleEndianImplicit
D: Requested Extended Negotiation: none
D: Accepted Extended Negotiation:  none
D: Requested User Identity Negotiation: none
D: User Identity Negotiation Response:  none
D: ======================= END A-ASSOCIATE-RQ ======================
D: Constructing Associate AC PDU
I: Sub-Association Acknowledged (Max Send PDV: 32756)
D: ====================== BEGIN A-ASSOCIATE-AC =====================
D: Our Implementation Class UID:      1.2.276.0.7230010.3.0.3.6.6
D: Our Implementation Version Name:   OFFIS_DCMTK_366
D: Their Implementation Class UID:    1.2.826.0.1.3680043.2.135.1066.101
D: Their Implementation Version Name: 1.5.0/WIN32
D: Application Context Name:    1.2.840.10008.3.1.1.1
D: Calling Application Name:    CONQUESTSRV1
D: Called Application Name:     DCMTK
D: Responding Application Name: 
D: Our Max PDU Receive Size:    16384
D: Their Max PDU Receive Size:  32768
D: Presentation Contexts:
D:   Context ID:        119 (Accepted)
D:     Abstract Syntax: =SecondaryCaptureImageStorage
D:     Proposed SCP/SCU Role: Default
D:     Accepted SCP/SCU Role: Default
D:     Accepted Transfer Syntax: =LittleEndianImplicit
D: Requested Extended Negotiation: none
D: Accepted Extended Negotiation:  none
D: Requested User Identity Negotiation: none
D: User Identity Negotiation Response:  none
D: ======================= END A-ASSOCIATE-AC ======================
D: DcmDataset::read() TransferSyntax="Little Endian Implicit"
```

After the reverse connection is established, the C-STORE request from the other party can be accepted and the transmission can begin.

```
I: Received Store Request
D: ===================== INCOMING DIMSE MESSAGE ====================
D: Message Type                  : C-STORE RQ
D: Presentation Context ID       : 119
D: Message ID                    : 3203
D: Affected SOP Class UID        : SecondaryCaptureImageStorage
D: Affected SOP Instance UID     : 1.3.6.1.4.1.5962.99.1.2280943358.716200484.1363785608958.60.0
D: Data Set                      : present
D: Priority                      : medium
D: Move Originator AE Title      : MOVESCU
D: Move Originator ID            : 1
D: ======================= END DIMSE MESSAGE =======================
D: DcmDataset::read() TransferSyntax="Little Endian Implicit"
D: DcmItem::checkAndUpdateVR() setting undefined VR of PixelPaddingValue (0028,0120) to 'US' because PixelRepresentation (0028,0103) has a value that is different from 1
D: DcmItem::checkAndUpdateVR() setting undefined VR of PixelPaddingRangeLimit (0028,0121) to 'US' because PixelRepresentation (0028,0103) has a value that is different from 1
W: DICOM file already exists, overwriting: SC.1.3.6.1.4.1.5962.99.1.2280943358.716200484.1363785608958.60.0
D: DcmFileFormat::checkMetaHeaderValue() Version of MetaHeader is ok: 0x0001
D: DcmFileFormat::checkMetaHeaderValue() use SOPClassUID [1.2.840.10008.5.1.4.1.1.7] from Dataset
D: DcmFileFormat::checkMetaHeaderValue() use SOPInstanceUID [1.3.6.1.4.1.5962.99.1.2280943358.716200484.1363785608958.60.0] from Dataset
D: DcmFileFormat::checkMetaHeaderValue() use new TransferSyntaxUID [Little Endian Implicit] on writing following Dataset
D: DcmFileFormat::validateMetaInfo() found 7 Elements in DcmMetaInfo 'metinf'
D: DcmDataset::read() TransferSyntax="Little Endian Implicit"
```

After a C-STORE transfer is complete, a C-MOVE response is received, but since there are other transfers in progress, the `DIMSE Status` is Pending. Then there is the next C-STORE request and the corresponding transmission process and response.

```
I: Received Move Response 1
D: ===================== INCOMING DIMSE MESSAGE ====================
D: Message Type                  : C-MOVE RSP
D: Message ID Being Responded To : 1
D: Affected SOP Class UID        : MOVEPatientRootQueryRetrieveInformationModel
D: Remaining Suboperations       : 1
D: Completed Suboperations       : 1
D: Failed Suboperations          : 0
D: Warning Suboperations         : 0
D: Data Set                      : none
D: DIMSE Status                  : 0xff00: Pending: Sub-operations are continuing
D: ======================= END DIMSE MESSAGE =======================
D: DcmDataset::read() TransferSyntax="Little Endian Implicit"
I: Received Store Request
D: ===================== INCOMING DIMSE MESSAGE ====================
D: Message Type                  : C-STORE RQ
D: Presentation Context ID       : 119
D: Message ID                    : 3225
D: Affected SOP Class UID        : SecondaryCaptureImageStorage
D: Affected SOP Instance UID     : 1.3.6.1.4.1.5962.99.1.2280943358.716200484.1363785608958.67.0
D: Data Set                      : present
D: Priority                      : medium
D: Move Originator AE Title      : MOVESCU
D: Move Originator ID            : 1
D: ======================= END DIMSE MESSAGE =======================
D: DcmDataset::read() TransferSyntax="Little Endian Implicit"
D: DcmItem::checkAndUpdateVR() setting undefined VR of PixelPaddingValue (0028,0120) to 'US' because PixelRepresentation (0028,0103) has a value that is different from 1
D: DcmItem::checkAndUpdateVR() setting undefined VR of PixelPaddingRangeLimit (0028,0121) to 'US' because PixelRepresentation (0028,0103) has a value that is different from 1
W: DICOM file already exists, overwriting: SC.1.3.6.1.4.1.5962.99.1.2280943358.716200484.1363785608958.67.0
D: DcmFileFormat::checkMetaHeaderValue() Version of MetaHeader is ok: 0x0001
D: DcmFileFormat::checkMetaHeaderValue() use SOPClassUID [1.2.840.10008.5.1.4.1.1.7] from Dataset
D: DcmFileFormat::checkMetaHeaderValue() use SOPInstanceUID [1.3.6.1.4.1.5962.99.1.2280943358.716200484.1363785608958.67.0] from Dataset
D: DcmFileFormat::checkMetaHeaderValue() use new TransferSyntaxUID [Little Endian Implicit] on writing following Dataset
D: DcmFileFormat::validateMetaInfo() found 7 Elements in DcmMetaInfo 'metinf'
D: DcmDataset::read() TransferSyntax="Little Endian Implicit"
I: Received Move Response 2
D: ===================== INCOMING DIMSE MESSAGE ====================
D: Message Type                  : C-MOVE RSP
D: Message ID Being Responded To : 1
D: Affected SOP Class UID        : MOVEPatientRootQueryRetrieveInformationModel
D: Remaining Suboperations       : 0
D: Completed Suboperations       : 2
D: Failed Suboperations          : 0
D: Warning Suboperations         : 0
D: Data Set                      : none
D: DIMSE Status                  : 0xff00: Pending: Sub-operations are continuing
D: ======================= END DIMSE MESSAGE =======================
D: DcmDataset::read() TransferSyntax="Little Endian Implicit"
```

After all C-STORE requests are completed, the server will send a successful C-STORE response:

```
I: Received Final Move Response
D: ===================== INCOMING DIMSE MESSAGE ====================
D: Message Type                  : C-MOVE RSP
D: Message ID Being Responded To : 1
D: Affected SOP Class UID        : MOVEPatientRootQueryRetrieveInformationModel
D: Remaining Suboperations       : 0
D: Completed Suboperations       : 2
D: Failed Suboperations          : 0
D: Warning Suboperations         : 0
D: Data Set                      : none
D: DIMSE Status                  : 0x0000: Success: Sub-operations complete - No failures or warnings
D: ======================= END DIMSE MESSAGE =======================
I: Releasing Association
```

At this point, the C-MOVE transfer is completed.

Image file transmission is TCP transmission with PDV=4096Bytes:

<img src="image-20211013195720471.png" alt="image-20211013195720471" style="zoom:50%;" />

The files downloaded to the local can be opened for viewing and processing, such as using the toolkit in DCMTK or other third-party software

```shell
➜  ~ getscu -k 08,52=STUDY -k StudyInstanceUID=1.3.6.1.4.1.5962.99.1.2280943358.716200484.1363785608958.61.0  192.168.31.156 5678  
➜  ~ ls -lt
total 148576
-rw-r--r--    1 zzy   staff  31354908 10  8 22:46 SC.1.3.6.1.4.1.5962.99.1.2280943358.716200484.1363785608958.67.0
-rw-r--r--    1 zzy   staff   4367746 10  8 22:45 SC.1.3.6.1.4.1.5962.99.1.2280943358.716200484.1363785608958.60.0
```

### C-GET

```shell
➜  ~ sudo getscu -v -k 08,52=STUDY -k StudyInstanceUID=1.3.6.1.4.1.5962.99.1.2280943358.716200484.1363785608958.61.0  192.168.31.156 5678  
I: Requesting Association
I: Association Accepted (Max Send PDV: 32756)
I: Sending C-GET Request (MsgID 1)
I: Received C-STORE Request (MsgID 4261)
I: Sending C-STORE Response (Success)
I: Received C-GET Response (Pending)
I: Received C-STORE Request (MsgID 4281)
I: Sending C-STORE Response (Success)
I: Received C-GET Response (Pending)
I: Received C-GET Response (Success)
I: Final status report from last C-GET message:
I:   Number of Remaining Suboperations : 0
I:   Number of Completed Suboperations : 2
I:   Number of Failed Suboperations    : 0
I:   Number of Warning Suboperations   : 0
I: Releasing Association
```

The process of C-GET is simpler than C-MOVE. It sends all Presentation Contexts like C-STORE when establishing a connection.

<img src="image-20211013234755122.png" alt="image-20211013234755122" style="zoom:50%;" />

The following is the message content of C-GET, which is similar to the structure of C-FIND:

<img src="image-20211013195701896.png" alt="image-20211013195701896" style="zoom:50%;" />

After sending the C-GET message, the other party will send a C-STORE message to start the transmission.

### three. Results and discussion

In this project, based on the DICOM standard, I have completed a mini-PACS system that meets 11 protocols of the DICOM standard by selecting the open source DCMTK toolkit that implements the DICOM standard as Modality and View Station, and CONQUEST as the Server. In the process, through the analysis of the DICOM standard reading and the packet capture software, the structure of the DICOM image transmission protocol is understood, and the design of its TCP -> ULP -> PDU -> DATA is understood. Based on the above understanding, the detailed process of transmission can be clearly understood, that is, the connection is controlled through Associate PDU and Release PDU, and data is transmitted through P-DATA. The data contains messages that are strictly defined in the format of DICOM3.0, so that the relevant interfaces are implemented. The transmission function specified by DICOM can be realized between the client and the server.

### quote

1. pydicom documentation: https://pydicom.github.io/pynetdicom/stable/user/presentation.html
2. DICOM Standard 3.0: http://dicom.nema.org/medical/dicom/current/output/chtml/
3. DICOM communication process: https://www.jianshu.com/p/6f178fc98a04
4. DCMTK：https://support.dcmtk.org/docs