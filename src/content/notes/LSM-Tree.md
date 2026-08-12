---
title: LSM-Tree: Log-Structured Merge-Tree
category: tech
tags: [LSM-Tree, Storage, Key-Value]
date: 2026-08-12
---

# LSM-Tree

## 1 LSM-Tree 的出现和发展

LSM-Tree 是一种面向高性能大批量写入的数据结构，于 1996 年被提出。

Google 的 LevelDB 和 Facebook 的 RocksDB 都以 LSM-Tree 作为核心存储结构。

## 2 基本设计思路

<img src="images/2026-08-12-11-02-42-image.png" alt="LSM-Tree 整体结构" width="720">

主要可以分成两个部分：内存和磁盘。内存部分读写很快，但不能保证持久化；磁盘部分能够持久化，但需要妥善组织才能获得较高的读写效率。整体上，为了保证写入高效率，整个数据结构采用 append-only 策略。

### 2.1 内存部分

内存存储结构被称为 MemTable，一般使用平衡二叉树或跳表实现。MemTable 需要高效读写，并能够快速得到 Key 的上下界；实际实现中主要使用跳表，因为跳表的维护比平衡二叉树（如 Splay Tree、Red-Black Tree）更简单直观，也更容易支持有序遍历。

### 2.2 磁盘部分

<img src="images/2026-08-12-11-19-39-image.png" alt="SSTable 分层结构" width="720">

磁盘部分采用分层存储。每一层有若干文件，每个文件称为 SSTable，用于持久化有序键值对。

一般来说，每个 SSTable 的大小上限固定（常见设置如 2MB）。

每个 SSTable 文件可以看成 4 部分：

1. **Header**：存储元数据，按顺序分别是时间戳（uint64）、SSTable 键值对数量（uint64）、键的最大值和最小值（int64），一共占用 32B。
2. **Bloom Filter**：用于快速判断 SSTable 中是否可能存在某个键；Bloom Filter 可能存在假阳性。对 LSM-Tree 而言，假阳性只会带来多余时间开销，假阴性则可能导致查找结果错误，因此前者更可接受。
3. **索引区（Index）**：存储有序索引，包括所有键以及对应值在文件中的 offset，可用遍历或二分查找定位。
4. **数据区（Data）**：存储值数据。

另一种思路是利用稀疏索引（Sparse Indexing）。完整数据形如：

```text
key1   value1
key2   value2
key3   value3
...
key100 value100
```

稀疏索引不记录所有 key，而是：

```text
key1   → offset 0
key20  → offset 500
key40  → offset 1000
key60  → offset 1500
...
```

查找 `Key35`：

```text
Index
  ↓
找到 key20
  ↓
知道 key20 的 offset
  ↓
从 offset 开始顺序扫描
  ↓
key21
key22
...
key35
```

若采用稀疏索引，data 区域的设计也可能变化：

```text
[key length][value length][key][value]
```

或者：

```text
[key][value]
```

### 2.3 设计特殊点

#### 2.3.1 层级文件数量

硬盘每一层的文件数量上限不同，层级越高，上限越高。一般 Level $n$ 层的文件数量上限为 $2^{n+1}$（即 Level 0 是 2，Level 1 是 4，Level 2 是 8，……）。除了 Level 0 之外，每一层中各个文件的键值区间不相交：例如 Level 0 中两个文件的 key 范围可以分别是 0–100 和 1–101，而其他层必须保证任意两个文件的键值区间不相交。

SSTable 以 `.sst` 作为扩展名，存放在数据目录中（数据目录作为构造函数参数给出）。Level 0 的文件应放在 `level-0` 目录下，Level 1 放在 `level-1` 目录下，以此类推。

#### 2.3.2 只读性

SSTable 保存在磁盘中，磁盘读写比内存慢几个数量级。查找时去磁盘读取 Bloom Filter 和索引很耗时，因此可将 SSTable 中除数据区外的部分缓存在内存中。之所以能缓存，得益于两点：

1. **除数据区外，其余区域较小，不包含 value，缓存不会占用过多内存。**
2. **SSTable 只读，一旦创建不可改变，因此内存缓存与文件内容始终一致。**

SSTable 一旦生成即不可变。**因此修改或删除时，只能新增一条相同键的记录。** 一个 Key 在系统中可能对应多条记录；为区分先后，可为每个条目增加时间戳。又因为每个 SSTable 中的数据是同时写成文件的，实际上只需在 Header 中记录该 SSTable 的生成时间戳即可。

#### 2.3.3 数据的新旧顺序

一般来说，最新版本会出现在 MemTable 中。磁盘上，除非在 Level-0，否则同一层内不可能出现同一个 key 多次——**因为 Level-0 之外的层，SSTable 之间不能有范围重叠；而 SSTable 要么来自 MemTable flush，要么来自 compaction，过程中内部不会有重复 key。** 同样在磁盘中，上层（level 编号更小）的数据更新，因为 compaction 会使数据下移。

#### 2.3.4 数据插入和 Compact 操作

数据插入时优先写入 MemTable（内存跳表）。

<img src="images/2026-08-12-15-52-58-image.png" alt="MemTable flush 与 Compaction" width="858">

- 当 MemTable 大小达到阈值时进行 **转化**：把 MemTable 打包成 SSTable 放入 Level-0。
- 若 Level-0 文件数量超过阈值，则进行 **Compact**：
  - 取出 Level-0 的 **所有 SSTable**，以及与这些 SSTable 有区间交集的 Level-1 SSTable，做多路归并，去除重复数据中较旧的版本，将新生成的 SSTable 全部放入 Level-1。
  - 若 Level-1 也超限，则选取其中 **时间戳最老的** $x$ 个 SSTable（$x$ = 当前层文件数 − 该层理论上限），再选取下一层中与这 $x$ 个 SSTable 有范围交集的文件，一并多路归并，新 SSTable 放入下一层。
  - 以此类推，直到各层文件数量均符合要求。

#### 2.3.5 删除操作

- 系统整体是 Append-only，删除不能直接抹掉数据。
- 若发现 MemTable 中有对应 key 就直接删掉，会带来问题：磁盘上更老的记录会重新变成“最新”。
- 实际采用 tombstone：插入一个特殊 `DELETE` 值，仍按插入路径处理。
- 若 DELETE 标记在合并后到达当前最底层，则可真正清除；否则不能删。
- DELETE 的成本实际上被 **延迟到了 Compaction**。

#### 2.3.6 查找操作

1. **优先查询 MemTable**
   - 直接在 MemTable 中查找键 $K$。
   - 若找到，立即返回对应 value，流程结束。

2. **MemTable 未命中，则逐层检查 SSTable**
   - 按层级从低到高（Level 0 → Level 1 → …）依次遍历。
   - 对每一层，检查内存中缓存的该层各 SSTable 元信息（Bloom Filter 与索引）。

3. **单个 SSTable 的检查过程**
   - **Bloom Filter**：用 $K$ 查询；若“不存在”，跳过该文件。
   - **若可能存在**：在内存索引中 **二分查找**，定位数据 offset。
   - **磁盘读取**：按 offset 读取 value。
   - 若最新记录为 Tombstone，则视为不存在，返回 Not Found。

4. **遍历完所有层级仍未找到**
   - 说明键 $K$ 不存在，返回未找到或空值。

## 3 性能分析

测试与分析可得吞吐大致为：

$$
\text{PUT} > \text{DELETE} > \text{GET}
$$

PUT 吞吐最高，因为主要是 MemTable 纯写路径，Compaction 开销被分摊；DELETE 通常也是追加 Tombstone，但可能含额外删除判断，吞吐略低；GET 需在 MemTable 与多个 SSTable 中找最新版本，受读放大影响，通常最低。

## 4 读放大和写放大问题

LSM-Tree 的核心思想是将随机写转换为顺序写，但也会引入明显的 **Read Amplification（读放大）** 与 **Write Amplification（写放大）**。

### 4.1 读放大

由于采用多层 SSTable，同一 Key 可能存在多个版本，一次 GET 可能需要检查多个 MemTable / SSTable。

例如：

```text
MemTable
  ↓
Level 0
  ├── SSTable 1
  ├── SSTable 2
  └── SSTable 3
  ↓
Level 1
  ├── SSTable 4
  └── SSTable 5
  ↓
Level 2
  └── ...
```

若查询的 Key 不存在，MemTable 与多个 SSTable 都可能需要检查，最坏情况下要遍历大量文件。

读放大主要来自：

1. **多个层级**
2. **同一层中多个 SSTable**
3. **同一 Key 的多个历史版本**
4. **Compaction 尚未及时清理旧版本**

#### 4.1.1 Bloom Filter

可用 Bloom Filter 判断某个 SSTable 是否可能包含目标 Key：

```text
GET(K)
  ↓
Bloom Filter
  ├── 不存在 → 跳过 SSTable
  └── 可能存在 → 查询 Index
```

Bloom Filter 无假阴性，不会漏掉真实存在的数据；但可能有假阳性，导致访问实际不含该 Key 的 SSTable。它能显著减少无效磁盘访问，但无法完全消除读放大。

#### 4.1.2 Key Range

对 Level 1 及以上，不同 SSTable 的 Key Range 不重叠，可根据 `minKey` / `maxKey` 判断目标 Key 是否可能落在该文件：

```text
L1:
  SSTable 1: [0, 100]
  SSTable 2: [101, 200]
  SSTable 3: [201, 300]
```

查询 `K = 150` 时可直接定位到 SSTable 2。

因此：

- **L0**：允许 Key Range 重叠，可能需检查多个 SSTable
- **L1 及以上**：Range 不重叠，最多定位一个 SSTable

#### 4.1.3 Block Cache

即使已通过 Bloom Filter 与 Index 定位到 SSTable，仍可能要从磁盘读 Data Block。可用 Buffer Pool / Block Cache 缓存热点块：

```text
GET(K)
  ↓
Bloom Filter
  ↓
Index
  ↓
Block Cache
  ├── Hit  → 直接读取
  └── Miss → 磁盘读取
```

对有局部性的 workload，Block Cache 能显著降低实际磁盘读放大。

### 4.2 写放大

写放大主要来自 **Compaction**。

一次逻辑写入往往对应多次物理写入：数据先入 MemTable，再 Flush 成 SSTable；随后在 Compaction 中被反复读取、合并并写入更低 Level。

```text
PUT
  ↓
MemTable
  ↓ Flush
L0
  ↓ Compaction
L1
  ↓ Compaction
L2
  ↓
L3
```

同一份数据可能在多个阶段被重复写入磁盘。

> **LSM-Tree 用写放大换取了较高的随机写入性能。**

#### 4.2.1 为什么会产生写放大

假设写入了 100 MB 数据：

```text
100 MB → MemTable
100 MB → L0 SSTable   (Flush)
100 MB → L1           (Compaction)
100 MB → L2           (再次 Compaction)
```

仅这一份数据就可能产生约 `100 + 100 + 100 + 100` MB 的磁盘写入。实际 Compaction 还要读旧 SSTable 并与其他文件归并，I/O 更高。

#### 4.2.2 Compaction 策略对写放大的影响

不同 Compaction 策略会产生不同程度的写放大。

##### Leveled Compaction

每一层 SSTable 通常有较严格的 Key Range 划分。当 SSTable 从上一层落到下一层时，需与下一层中 Range 重叠的 SSTable 合并。

优点：

- 每层数据组织较紧凑
- 查询需检查的 SSTable 较少
- Read Amplification 较低

缺点：

- Compaction 较频繁
- 数据可能被多次重写
- Write Amplification 较高

##### Tiered / Size-Tiered Compaction

先积累多个大小相近的 SSTable，再一次性合并。

优点：

- Compaction 次数较少
- Write Amplification 较低
- 写入吞吐较高

缺点：

- 同一层可能有更多 SSTable
- GET 需检查更多文件
- Read Amplification 较高

典型权衡：

| Compaction 策略 | Read Amplification | Write Amplification |
| --------------- | ------------------ | ------------------- |
| Leveled         | 较低               | 较高                |
| Tiered          | 较高               | 较低                |

### 4.3 读放大与写放大的权衡

LSM-Tree 本质上是在不同资源之间权衡：

> **通过更多后台 Compaction 与写放大，换取更低的读放大和更好的查询性能。**

可简单表示为：

```text
Read Amplification ↓
        ↑
 Leveled Compaction
        ↑
Write Amplification
```

以及：

```text
Write Amplification ↓
        ↑
  Tiered Compaction
        ↑
Read Amplification
```

不存在对所有场景都最优的策略。

若系统主要是：

- 写多读少
- 大量顺序写入
- 对单次 GET 延迟要求较低

则可倾向于降低 Write Amplification。

若系统主要是：

- 读多写少
- GET 非常频繁
- 对读取延迟要求较高

则更需要降低 Read Amplification。

### 4.4 LSM-Tree 中的三种放大

除读/写放大外，还可考虑 **Space Amplification（空间放大）**：

| 指标                | 含义                           | 主要原因                      |
| ------------------- | ------------------------------ | ----------------------------- |
| Read Amplification  | 一次读取需访问多少额外数据     | 多层 / 多个 SSTable           |
| Write Amplification | 一次逻辑写入产生多少物理写入   | Flush、Compaction             |
| Space Amplification | 实际占用空间相对有效数据的倍数 | 历史版本、Tombstone、合并延迟 |

例如降低 Compaction 频率可减少写放大，但会导致更多旧版本残留、更多 SSTable，从而抬高读放大与空间放大。

完整优化是在 **Read / Write / Space Amplification** 三者之间找平衡。

## 5 可行的优化路径

### 5.1 WAL 与崩溃恢复

通过 WAL（Write-Ahead Logging）保证崩溃后能恢复尚未持久化到 SSTable 的数据：写操作先记 WAL，再更新 MemTable；崩溃后重放尚未进入 SSTable 的 WAL 记录即可恢复。可配合 Checkpoint，定期记录系统状态，避免恢复时重放过长的 WAL。

### 5.2 Batch Write

大量 PUT 同时到来时，不宜一条条单独写入。可积攒一批请求后批量处理，并在 WAL 中记录一次写入，从而：

- 减少 syscall
- 减少锁竞争
- 提高 CPU cache locality
- 提高吞吐

### 5.3 Buffer Pool

缓存最近访问 / 高频访问的 block，提高访存效率；替换策略可参考操作系统页缓存思路。

### 5.4 Immutable MemTable

为降低 MemTable 读写锁竞争，可拆成 Active MemTable 与 Immutable MemTable：

```text
Active MemTable
  ↓ 达到大小阈值
Immutable MemTable
  ↓
后台 Flush
  ↓
SSTable
```

Active MemTable 满后，不阻塞前台去同步构建 SSTable，而是转为 Immutable，同时新建 Active 接收写入。这样可以：

- 前台写请求持续执行
- Immutable MemTable 可并发读取
- Flush 放到后台线程
- 降低 Flush 对 PUT 延迟的影响

### 5.5 后台 Flush

MemTable → SSTable 不应阻塞前台请求。可划分为：

```text
Foreground
  ├── GET
  ├── PUT
  └── DELETE
Background
  ├── MemTable Flush
  └── Compaction
```

前台 MemTable 达阈值时，只需转为 Immutable，由后台写入 Level-0，从而避免同步生成 SSTable 导致的长尾延迟。
