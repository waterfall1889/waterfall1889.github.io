---
title: LSM-Tree:Log-Structure-Merged Tree
category: tech
tags: [Key-Value Storage, Storage, Data Structure]
date: 2026-08-12
---

# LSM-Tree

## 1 LSM-Tree 的出现和发展

LSM Tree 是一种高性能大批量写入操作的数据结果，在1996年被提出。

Google的LevelDB和Facebook的RocksDB都是以LSM Tree为核心的数据结构。

## 2 基本设计思路

![](C:\Users\30884\AppData\Roaming\marktext\images\2026-08-12-11-02-42-image.png)

主要可以分成两个部分，内存和磁盘部分。内存部分读写很快，但是不能保证持久化存储；磁盘部分能够持久化存储，但是需要进行妥善安置构造才能有较高的读写效率。整体来看，为了保证写入的高效率，整个数据结构采用了append-only的策略。

### 2.1 内存部分

内存存储结构被称为MemTable，一般使用平衡二叉树或者跳表完成。这是由于，MemTable需要高效的读写，且需要能够快速得到Key的上下界；实际实现中主要使用跳表，这是由于跳表的维护比起平衡二叉树（如 splay Tree、Red-Black Tree更加简单直观）。而且，跳表天然更容易支持有序遍历。

### 2.2 磁盘部分

![](C:\Users\30884\AppData\Roaming\marktext\images\2026-08-12-11-19-39-image.png)

磁盘部分的存储采用的是分层存储。每一层会有若干个文件，每个文件被称为SSTable，用于持久化有序存储键值对。

一般来说，每个SSTable的大小上限固定（比如常见的设置是2MB）。

每个SSTable文件可以看成4部分：

- **1. Header**：用于存储元数据，按顺序分别是时间戳（uint64）、SSTable键值对数量（uint64）、键的最大值和最小值（int64），一共占用32B。

- **2.Bloom Filter**：用于快速判断SSTable中是否存在某个键值；Bloom Filter的问题是，可能存在假阳性；不过对于LSM-Tree而言，假阳性带来的是多余的时间开销，而假阴性带来的可能是查找结果的错误，因此相比之下前者更可被接受

- **3.索引区（Index）**：用于存储有序的索引数据，包括所有的键和对应值在文件的offset。可以用遍历查找或者二分查找找到对应数据。

- **4.数据区（data）**：存储值数据。

另一种思路是利用稀疏索引（Sparse Indexing）：

```
key1   value1
key2   value2
key3   value3
...
key100 value100
```

我们不记录所有的key的index，而是：

```
key1   → offset 0
key20  → offset 500
key40  → offset 1000
key60  → offset 1500
...
```

查找Key35：

```
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

此外，如果采用稀疏索引，那么data区域的设计可能也会发生变化：

```
[key length][value length][key][value]
```

或者：

```
[key][value]
```

### 2.3 设计特殊点

### 2.3.1 层级文件数量

硬盘存储每一层的文件数量上限不同，层级越高，上限越高。每一层之间的文件数量上限是预设的，一般 Level n 层的文件数量上限为 $2^{n+1}$ （即 Level 0 是 2，Level 1 是 4，Level 2 是 8，……）；除了 Level 0 之外，每一层中各个文件的键值区间不相交，例如在 Level 0 层中，两个文件包含的 key 的范围可以分别是 0-100 和 1-101，而在其他层中则需要确保任意两个不同文件的键值区间不相交。

SSTable 以 “.sst” 作为拓展名，所以文件存放在数据目录中（数据目录作为构造函数参数给出），Level 0 层的文件应保证在数据目录中的 “level-0” 目录下，Level 1 层的文件应保存在数据目录中的 “level-1” 目录下，以此类推。

### 2.3.2 只读性

SSTable 是保存在磁盘中的，而磁盘的读写速度比内存要慢几个数量级。因此在查找时，去磁盘读取 SSTable 的 Bloom Filter 和索引是很耗时的操作。为了避免多次磁盘的读取操作，我们可以将 SSTable 中除了数据区外的其他部分缓存在内存中。之所以能够将其缓存在内存中，得益于以下两点：

1. **除了数据区之外，SSTable 中其余区的大小比较小，不包括值 value，因此缓存在内存中不会占用过多的内存。**

2. **SSTable 是只读的，一旦创建不可改变。因此，将其缓存在内存中，其内容与 SSTable 文件中的索引内容始终保持一致，不会产生不一致的情况。**

需要注意的是，SSTable 文件一旦生成，是不可变的。**因此在进行修改或者删除操作时，只能在系统中新增一条相同键的记录，表示对应的修改和删除操作**。因此一个键 Key 在系统中可能对应多条记录，为区分它们的先后，可以为每个条目增加一个时间戳，又考虑到每个 SSTable 中的数据是同时被写成文件的，因此其实只需在 SSTable 的 Header 中记录当前 SSTable 生成的时间戳即可。

### 2.3.3 数据的新旧顺序

一般来说，数据的最新版本会出现在memTable内；同样在磁盘存储时，除非在Level-0，否则不可能同一层内出现同一个key多次。**（因为Level-0之外的层，SSTable之间不能有范围重叠；而SSTable的生成要么来源于memTable的转化，要么是compact合并，这个过程，SSTable内部不会有重复的key）** 同样在磁盘的数据，一般上层的数据（level编号小的数据）更新，因为compact操作会导致数据下移。

### 2.3.4 数据插入和Compact操作

当数据插入时，优先插入memTable，即内存的跳表里。

<img src="file:///C:/Users/30884/AppData/Roaming/marktext/images/2026-08-12-15-52-58-image.png" title="" alt="" width="858">

- 当内存的memTable大小达到阈值，那么此时会进行**转化**——把memTable打包转化为SSTable放入Level-0。

- 若Level-0的文件数量超过阈值限制，那么此时进行**Compact操作：**
  
  - 取出Level-0的**所有SSTable**和与这些SSTable有数据区间交集的Level-1的SSTable，对于这些SSTable进行多路归并排序，去除掉重复数据中较旧的数据，合并新生成的若干个SSTable全部放到Level-1
  
  - 如果此时Level-1的文件数量也超过限制，那么选取其中**时间戳最老的** x 个SSTable（x为当前层文件数量减去当前层理论文件数上限的值），选择下一层的、与这x个SSTable存在数据范围交集的若干个SSTable，全部进行多路归并合并，新生成的SSTable全部放入下一层。
  
  - 以此类推，直到所有层的文件数量均符合要求。

### 2.3.5 删除操作

- 由于整个数据系统设计是一个Append-only的，那么，删除操作不能直接进行

- 如果发现memTable中存在对应的key就直接删除，会造成很多问题，比如磁盘上更老的记录会替代成为最新的记录

- 实际实现时，利用tombstone思想，直接插入键值对，但是在值进行特殊的设计，规定一个`DELETE`值，直接按照插入策略进行

- 若DELETE标记能够在合并后到达当前最底层，则可以删除；否则不能删除。

- DELETE 的成本实际上被**延迟到了 Compaction**

### 2.3.6 查找操作

1. **优先查询 MemTable（内存表）**
   
   - 直接在 MemTable 中查找键 K。
   
   - 如果找到，立即返回对应的 value，流程结束。

2. **MemTable 未命中，则逐层检查 SSTable（磁盘文件）**
   
   - 按照层级从低到高（Level 0 → Level 1 → ...）依次遍历。
   
   - 对于每一层，检查内存中缓存的该层各 SSTable 的元信息（布隆过滤器和索引）。

3. **单个 SSTable 的检查过程**
   
   - **布隆过滤器快速判断**：用 K 查询 Bloom Filter，若结果为“不存在”，则跳过该文件，继续下一个。
   
   - **若 Bloom Filter 认为可能存在**：在内存缓存的索引中使用**二分查找**，定位 K 在该文件中的数据偏移量（offset）。
   
   - **磁盘读取**：根据 offset 从磁盘上的 SSTable 文件中读取对应的 value。
   
   - 查询过程中遇到某个 key 的最新记录时，如果该记录为 Tombstone，则认为该 key 不存在，并立即返回 Not Found。

4. **遍历完所有层级仍未找到**
   
   - 说明键 K 在当前系统中不存在，返回“未找到”或空值。

## 3 性能分析

测试结果和算法分析可以得到，吞吐率PUT > DELETE > GET.

LSM 的 PUT 吞吐最高，因为 PUT 基本是 MemTable 的纯写路径,Compaction操作实际上开销被分摊了；DELETE 通常也是追加 Tombstone，但实现上可能包含额外的删除判断，因此吞吐略低；GET 则需要在 MemTable和多个 SSTable 中寻找最新版本，受到读放大的影响，因此通常最低。

## 4 读放大和写放大问题

LSM-Tree 的核心思想是将随机写转换为顺序写，但这种设计也会引入明显的 **Read Amplification（读放大）** 和 **Write Amplification（写放大）** 问题。

### 4.1 读放大

由于 LSM-Tree 采用多层 SSTable 存储数据，同一个 Key 在不同时间可能存在多个版本，因此一次 GET 操作可能需要检查多个 MemTable 和 SSTable。

例如：

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

如果查询的 Key 不存在，那么 MemTable 和多个 SSTable 都可能需要检查，最坏情况下需要遍历大量文件。

因此，LSM-Tree 的读放大主要来自：

1. **多个层级**
2. **同一层中多个 SSTable**
3. **同一个 Key 可能存在多个历史版本**
4. **Compaction 尚未及时清理旧版本**

#### 4.1.1 Bloom Filter

可以使用 Bloom Filter 判断某个 SSTable 是否可能包含目标 Key。

查询过程：

GET(K)  
↓  
Bloom Filter  
├── 不存在 → 跳过 SSTable  
└── 可能存在 → 查询 Index

Bloom Filter 不会产生假阴性，因此不会漏掉真正存在的数据；但是可能产生假阳性，导致访问实际上不包含该 Key 的 SSTable。

因此 Bloom Filter 可以显著减少无效磁盘访问，但无法完全消除读放大。

#### 4.1.2 Key Range

对于 Level 1 及以上的层，由于不同 SSTable 之间的 Key Range 不重叠，因此可以根据 SSTable 的 `minKey` 和 `maxKey` 判断目标 Key 是否可能存在于该文件中。

例如：

L1：

SSTable 1：[0, 100]  
SSTable 2：[101, 200]  
SSTable 3：[201, 300]

查询 `K = 150` 时，可以直接定位到 SSTable 2，而不需要依次检查三个 SSTable。

因此，L0 和 L1 及以上的读放大情况有所不同：

- L0：SSTable 之间允许 Key Range 重叠，因此可能需要检查多个 SSTable
- L1 及以上：SSTable 之间 Key Range 不重叠，因此最多只需要定位一个 SSTable

#### 4.1.3 Block Cache

即使已经通过 Bloom Filter 和 Index 定位到了 SSTable，仍然可能需要从磁盘读取 Data Block。

因此可以使用 Buffer Pool / Block Cache 缓存热点 Data Block：

GET(K)  
↓  
Bloom Filter  
↓  
Index  
↓  
Block Cache  
├── Hit → 直接读取  
└── Miss → 磁盘读取

对于具有明显访问局部性的 workload，Block Cache 可以显著降低实际的磁盘读放大。

### 4.2 写放大

LSM-Tree 的写放大主要来自 **Compaction**。

一次数据写入并不会只在磁盘上写入一次。数据首先进入 MemTable，之后被 Flush 成 SSTable；随着 Compaction 的进行，这些数据又会被不断读取、合并并重新写入更低的 Level。

例如：

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

同一份数据可能在多个阶段被重复写入磁盘。

因此：

> **LSM-Tree 用写放大换取了较高的随机写入性能。**

#### 4.2.1 为什么会产生写放大

假设写入了 100 MB 数据：

第一次：

100 MB → MemTable

Flush：

100 MB → L0 SSTable

Compaction：

100 MB → L1

再次 Compaction：

100 MB → L2

如果不考虑其他数据，仅仅这一份数据就可能产生：

100 MB + 100 MB + 100 MB + 100 MB

的磁盘写入。

实际情况下，Compaction 通常还需要读取旧 SSTable，并与其他 SSTable 进行归并，因此实际 I/O 开销会更高。

#### 4.2.2 Compaction 策略对写放大的影响

不同 Compaction 策略会产生不同程度的写放大。

#### Leveled Compaction

在 Leveled Compaction 中，每一层的 SSTable 通常具有较严格的 Key Range 划分。

当某个 SSTable 从上一层 Compaction 到下一层时，需要与下一层中 Key Range 重叠的 SSTable 合并。

优点：

- 每一层的数据组织比较紧凑
- 查询时需要检查的 SSTable 较少
- Read Amplification 较低

缺点：

- Compaction 比较频繁
- 数据可能被多次重写
- Write Amplification 较高

#### Tiered / Size-Tiered Compaction

另一种思路是先积累多个大小相近的 SSTable，再一次性合并。

优点：

- Compaction 次数较少
- Write Amplification 较低
- 写入吞吐较高

缺点：

- 同一层可能存在更多 SSTable
- GET 需要检查更多文件
- Read Amplification 较高

因此两者形成了典型的权衡：

| Compaction 策略 | Read Amplification | Write Amplification |
| ------------- | ------------------ | ------------------- |
| Leveled       | 较低                 | 较高                  |
| Tiered        | 较高                 | 较低                  |

### 4.3 读放大与写放大的权衡

LSM-Tree 的设计实际上是在不同的资源之间进行权衡：

> **通过更多的后台 Compaction 和写放大，换取更低的读放大和更好的查询性能。**

可以简单表示为：

Read Amplification ↓  
↑  
Leveled Compaction  
↑  
Write Amplification

而：

Write Amplification ↓  
↑  
Tiered Compaction  
↑  
Read Amplification

因此并不存在一个对所有场景都最优的 Compaction 策略。

如果系统主要是：

- 写多读少
- 大量顺序写入
- 对单次 GET 延迟要求较低

则可以倾向于降低 Write Amplification。

如果系统主要是：

- 读多写少
- GET 请求非常频繁
- 对读取延迟要求较高

则更需要降低 Read Amplification。

### 4.4 LSM-Tree 中的三种放大

除了 Read Amplification 和 Write Amplification，还可以考虑 **Space Amplification（空间放大）**。

因此 LSM-Tree 通常需要同时考虑三个指标：

| 指标                  | 含义               | 主要原因                         |
| ------------------- | ---------------- | ---------------------------- |
| Read Amplification  | 一次读取需要访问多少额外数据   | 多层 SSTable、多个 SSTable        |
| Write Amplification | 一次逻辑写入产生多少物理写入   | Flush、Compaction             |
| Space Amplification | 实际占用空间相对于有效数据的倍数 | 历史版本、Tombstone、Compaction 延迟 |

三者之间同样存在一定的权衡。

例如降低 Compaction 频率可以减少 Write Amplification，但会导致：

- 更多旧版本残留
- 更多 SSTable
- 更高 Read Amplification
- 更高 Space Amplification

因此，一个完整的 LSM-Tree 优化实际上是在：

**Read Amplification、Write Amplification、Space Amplification**

三者之间寻找合适的平衡点。

## 5 可行的优化路径

### 5.1 WAL日志和崩溃恢复

通过 WAL（Write-Ahead Logging）保证系统在发生崩溃后能够恢复尚未持久化到 SSTable 的数据。
在执行写操作时，首先将操作记录写入 WAL，再更新 MemTable。系统崩溃后，可以通过重新执行 WAL 中尚未进入 SSTable 的操作恢复 MemTable。
此外，可以配合 Checkpoint 机制，定期记录当前系统状态，从而避免恢复时需要重新执行过长的 WAL。

### 5.2 Batch Write

当有大量PUT操作同时请求时，最好不要一条条单独写入，这样效率会降低

可以积攒一定的请求后批量处理，在WAL日志记录一次写入

- 减少 syscall
- 减少锁竞争
- 提高 CPU cache locality
- 提高吞吐

### 5.3 Buffer pool

设计策略，进行缓存，缓存最近访问 / 高频访问的 block，这样可以提高访存效率

替换策略可以考虑参考OS缓存设计的思路

### 5.4 Immutable MemTable

为了降低 MemTable 读写之间的锁竞争，可以将 MemTable 分为 Active MemTable 和 Immutable MemTable。

```
Active MemTable  
↓ 达到大小阈值  
Immutable MemTable  
↓  
后台 Flush  
↓  
SSTable
```

当 Active MemTable 达到大小限制后，不立即阻塞前台请求进行 SSTable 构建，而是将其转换为 Immutable MemTable，同时创建一个新的 Active MemTable 接收后续写入。

这样可以实现：

- 前台写请求持续执行
- Immutable MemTable 可以并发读取
- SSTable Flush 可以放到后台线程执行
- 降低 Flush 对 PUT 延迟的影响

### 5.5 后台 Flush

MemTable 转换为 SSTable 的过程不应该阻塞前台请求。

可以将系统划分为前台线程和后台线程：

```
Foreground  
├── GET  
├── PUT  
└── DELETE
Background  
├── MemTable Flush  
└── Compaction
```

当前台 MemTable 达到大小阈值时，只需要将其转换为 Immutable MemTable，然后由后台线程负责将其写入 Level-0。

这样可以避免 MemTable 满后同步生成 SSTable，导致前台线程长时间阻塞，从而降低写入延迟和延迟抖动。