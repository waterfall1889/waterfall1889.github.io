---
title: Full-Text Searching
category: Course
tags: [Lucene, Search, Application Architecture]
date: 2025-09-15
---

# Full-Text Searching

## 1 全文搜索与 Lucene

**Lucene** 是一个**高性能、可扩展的信息检索（Information Retrieval，IR）库**，用于为应用程序添加**索引和搜索功能**。

- 成熟、免费的开源项目，使用 **Java** 实现
- 属于 **Apache Jakarta** 项目家族，采用宽松的 Apache 软件许可证
- 提供简单但功能强大的核心 API，即使对全文索引和搜索原理了解不多，也可以较为轻松地使用

高度结构化的数据更容易做搜索。全文搜索的核心是在**非结构化文本中寻找关键字**。

## 2 顺序扫描的局限

最直观的做法是：**顺序容器 + 逐条扫描**。

假设只有一个顺序容器 `List<Document>`，每个 `Document` 里有一段文本：

```text
doc1: "Lucene is a high performance search library"
doc2: "Search engines use inverted index"
doc3: "Lucene is written in Java"
```

用户输入查询 `"Lucene Java"` 时，只能逐行查找。这种方式效率很低：

- 数据一多就不可用
- 无法按相关性排序
- 不支持复杂查询（短语、AND / OR）

这是**全文搜索最原始、最不可扩展**的方式。

## 3 反向索引（倒排索引）

反向索引做全文搜索的过程，本质是把“扫描所有文档”变成“在若干个有序列表上做集合运算 + 相关性计算”。

**结构：**

```text
term → 出现该 term 的文档列表
```

例如三篇文档：

```text
doc1: "lucene is fast"
doc2: "lucene is scalable"
doc3: "fast search engine"
```

构建反向索引：

```text
lucene   → [1, 2]
is       → [1, 2]
fast     → [1, 3]
scalable → [2]
search   → [3]
engine   → [3]
```

**词是入口，文档是结果。**

一般来说，需要先制作索引再进行搜索。Lucene 内置了多种解析器，用于解析不同文件，进而完成后续的建立索引。

## 4 基本工作流程

### 4.1 Step 1：文档建索引（Indexing）

对每个文档：

1. 经 **Analyzer** 处理文本（切词 + TokenFilter 链）
2. 生成 term
3. 写入倒排索引
4. 解析过程中会产生 **Field**

#### Analyzer：Tokenizer + TokenFilter 链

笔记里常说的“分词、归一化”，在 Lucene 中由 **Analyzer** 统一完成。Analyzer 由两部分组成：

| 组件 | 作用 | 示例 |
| --- | --- | --- |
| **Tokenizer** | 将原始文本切成 token 流 | 按空白、标点切分；中文可按字/词切分 |
| **TokenFilter**（可串联多个） | 对 token 依次变换 | 小写、去停用词、词干提取、同义词扩展等 |

典型链路示意：

```text
原文 → Tokenizer → TokenFilter₁ → TokenFilter₂ → … → term
```

例如：`Computing Algorithms` → Tokenizer → `["Computing", "Algorithms"]` → LowerCaseFilter → `["computing", "algorithms"]` → StemFilter → `["comput", "algorithm"]`。

要点：

- **Filter 的顺序与组合直接影响索引结果**：建索引与查询两侧应使用一致的 Analyzer，否则 term 对不上。
- **词干提取（Stemming）**（如 `computing → comput`）与**词形还原（Lemmatization）**不同：前者是启发式截断/规则，后者依赖词典与词性；Lucene 常见的是 stemming，需按语言与业务明确配置。
- 停用词、同义词等 Filter 会改变可检索的 term 集合，进而影响召回与排序。

### 4.2 Step 2：查询解析（Query Parsing）

将用户输入解析为可执行的查询结构（如布尔组合、短语查询等）。

### 4.3 Step 3：取倒排列表

根据查询中的各个 term，取出对应的文档列表。

### 4.4 Step 4：集合运算（最核心）

对多个 term 的文档列表做交集 / 并集等运算：

```text
intersect(
   intersect([1,3,8], [3,8]),
   [8,9,10]
) → [8]
```

### 4.5 Step 5：相关性计算 + 排序（BM25）

多词查询需要对候选文档打分并排序。早期教材常用 **TF-IDF** 的简化思路（如「总出现次数 / 出现文档数」）来解释词权重；但 **Lucene 从 6.0 起默认使用 BM25**，对排序结果影响很大。

**BM25 相对 TF-IDF 的关键差异：**

1. **词频饱和（Term Frequency Saturation）**  
   一词在文档中出现多次**不会等比例加分**。出现 1 次到 2 次提升明显，出现 10 次到 20 次增益很小，避免“堆词”刷高分。

2. **字段长度归一化（Field Length Normalization）**  
   同样匹配在**长文档**中会被稀释：长文碰巧包含查询词，得分通常低于短而精准的匹配。

3. **IDF 仍保留“稀有词更重要”的思想**  
   在大量文档中都出现的词权重更低，但与饱和的 TF、长度归一化一起构成完整公式。

因此：出现次数多 ≠ 一定排更前；文档更长 ≠ 一定更相关。实际评分还可自定义 Similarity，但理解默认 **BM25** 是理解 Lucene 排序行为的前提。

## 5 准确率与召回率

全文搜索是“基于词项的统计近似”，而不是“基于语义的真值判断”。可能出现：

| 概念 | 英文 | 含义 |
| --- | --- | --- |
| **真正例** | True Positive（TP） | 真正相关且被返回 |
| **假正例** | False Positive（FP） | 规则上匹配，但实际寓意不相关 |
| **假负例** | False Negative（FN） | 实际相关，但没有被返回 |

```text
准确率 Precision = TP / 总查询返回数量
召回率 Recall    = TP / (TP + FN)
```

若约束更严格，准确率可能提高，但也可能遗漏部分 TP，导致召回率下降。

## 6 Field

**Field** 是 Lucene 中“一个文档里可被单独处理、单独索引、单独搜索、单独存储的最小逻辑单元”。

每个 Field 由三部分组成：**名称（name）**、**类型（type）** 和 **值（value）**。

Field 的值可以是：

- **文本**（`String`、`Reader` 或预先分析过的 `TokenStream`）
- **二进制数据**（`byte[]`）
- **数值类型**（`Number`）

Field 可以选择性地被 **存储（stored）** 在索引中，这样在文档命中搜索结果时，就可以将该 Field 的内容一并返回。

示例：

```java
文章ID: 20240101
标题: Lucene 全文搜索原理
作者: 张三
发布时间: 2024-01-01
正文: Lucene 是一个基于倒排索引的全文搜索库……

doc.add(new StringField("id", "20240101", Field.Store.YES));
doc.add(new TextField("title", "Lucene 全文搜索原理", Field.Store.YES));
doc.add(new StringField("author", "张三", Field.Store.YES));
doc.add(new LongPoint("publish_time", 1704038400L));
doc.add(new TextField("content",
        "Lucene 是一个基于倒排索引的全文搜索库……",
        Field.Store.NO));
```

## 7 Segments（段）

Lucene 的一个索引可以由多个子索引组成，这些子索引称为 **段（segments）**。每个段都是一个**完全独立的索引**，可以被单独搜索。

一次搜索可能会涉及**多个段和/或多个索引**，而每个索引本身又可能由若干个段组成。

### 7.1 段不可变：更新 = 标记删除 + 新增

**段一旦写入就不可修改。** 这是理解 Lucene 索引维护与性能的关键：

| 操作 | 实际做法 |
| --- | --- |
| **新增文档** | 写入新段（或追加到尚未提交的内存缓冲，提交后形成新段） |
| **更新文档** | 先在 `.del` 文件中**标记旧文档编号为已删除**，再**写入一份新文档** |
| **删除文档** | 同样写入 `.del`，只做逻辑删除，不立刻改动段内数据 |

因此：

- **搜索时必须过滤已删除的文档编号**，否则会命中“幽灵”旧版本文档。
- **合并（merge）时才物理移除**被删除文档，并把多个段整理成更少、更紧凑的新段。
- 索引演化 = **不断产生新段 + 用 `.del` 标记失效文档 + 后台 merge 清理**，而不是原地改写已有段。

这也解释了为何频繁更新会导致段数量增多、删除标记累积，从而影响搜索与磁盘开销——直到 merge 消化掉它们。

### 7.2 文档编号（Document Numbers）

在内部实现中，Lucene 使用一个**整数型的文档编号**来标识文档。索引中加入的第一篇文档编号为 **0**，之后每加入一篇文档，其编号就在前一个的基础上 **加 1**。`.del` 中记录的正是这些编号，供搜索过滤与 merge 物理清理使用。
