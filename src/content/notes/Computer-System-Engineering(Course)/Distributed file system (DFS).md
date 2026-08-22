---
title: DFS:Distributed File System
category: Course
tags: [Distributed System, Storage, Network]
date: 2025-11-10
---

# Distributed File System

## 1 FTP file system

FTP 文件系统是一个依托于网站的简单文件系统，实现了文件的下载和上传。这也是一种最简单的分布式文件系统和网络文件系统之一。

<img title="" src="images/FTP.png" alt="" width="752">

| 操作         | 实质                              |
| ---------- | ------------------------------- |
| Read file  | copy file from server to client |
| Write file | copy file from client to server |

**优点**：构建简单，技术难度低

**缺点**：

- 浪费，很小的需求比如只需要文件的一部分也必须给到整个文件

- 文件本身如果过大，用户的直接下载储存可能很困难

- 多个用户同时修改文件可能无法保证一致性

## 2 RPC接口设计实现文件系统

通过RPC接口实现**File service provide functional interface with RPC（Remote access model）**，好处是可以有效避免臃肿问题，可以比较精确获得需要的信息，且可以保证一致性，但是可能出现网络问题，在整个文件访问期间，客户端都会持续访问服务器；而且同样的数据可能会被多次重复请求。

## 3 NFS：Network file system

### 3.1 NFS设计思路

| 设计目标和基本要求                               | 分析                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| Any machine can be a Client or a Server | 任意机器理论上都可以提供文件系统，也可以挂载并使用其他机器提供的文件系统，不限定专门的服务器硬件。这样可以有效降低成本和提高系统的可靠性可用性。        |
| Support diskless workstations           | 支持无盘工作站。客户端甚至可以没有本地磁盘，通过网络从服务器获取文件系统，必要时连根文件系统都可以远程挂载。                          |
| Support heterogeneous deployment        | 支持异构环境。不同硬件架构、不同操作系统的机器之间也应该能够共享文件。                                             |
| Access transparency                     | 访问透明性：用户最好感觉不到文件是在本地还是远程。例如本地用 /home/a.txt，远程 NFS 挂载后仍然像普通目录一样 open/read/write。 |
| Recovery from failure                   | 能从故障中恢复。例如服务器或网络暂时故障后，客户端应能重新建立通信，而不是整个文件系统永久失效。                                |
| High performance                        | 网络文件访问不能太慢，需要通过缓存、批量传输、减少 RPC 次数等方式降低网络开销。                                      |

下面是一些常见的幂等操作RPC，这是NFS设计的重要思路来源：

| Remote Procedure Call              | Returns                  |
| ---------------------------------- | ------------------------ |
| NULL ()                            | Do nothing.              |
| LOOKUP (dirfh, name)               | fh and file attributes   |
| CREATE (dirfh, name, attr)         | fh and file attributes   |
| REMOVE (dirfh, name)               | status                   |
| GETATTR (fh)                       | file attributes          |
| SETATTR (fh, attr)                 | file attributes          |
| READ (fh, offset, count)           | file attributes and data |
| WRITE (fh, offset, count, data)    | file attributes          |
| RENAME (dirfh, name, tofh, toname) | status                   |
| LINK (dirfh, name, tofh, toname)   | status                   |
| SYMLINK (dirfh, name, string)      | status                   |
| READLINK (fh)                      | string                   |
| MKDIR (dirfh, name, attr)          | fh and file attributes   |
| RMDIR (dirfh, name)                | status                   |
| READDIR (dirfh, offset, count)     | directory entries        |
| STATFS (fh)                        | file system information  |

### 3.2 NFS Mount协议

NFS Mount协议（挂载协议）是客户端访问远程文件系统的第一步，建立了客户端与服务器之间的连接关系。**Mount 协议建立的是客户端本地挂载点与远程文件系统之间的逻辑映射关系，而不是传统意义上的持久连接。本质是一个Stateless的连接，而且不是TCP协议那种持久性的连接。**

- **步骤1：客户端发起挂载请求**
  
  - 命令格式：mount [服务器IP]:[远程路径] [本地挂载点]（例如客户端执行: mount 192.168.1.100:/users/paul /home/paul）
  
  - 含义: 将服务器192.168.1.100的/users/paul目录挂载到本地的/home/paul，这是一个用户态命令，它会触发内核中的NFS客户端模块，向远端的 rpc.mountd 守护进程（而非NFS主进程）发起RPC调用。**这个步骤调用的不是表中的任何RPC（属于NFS协议，负责文件读写），而是调用 MOUNT协议（程序号100005） 中的 MOUNTPROC_MNT 过程。**
  
  - 客户端发送的路径是 /users/paul，服务器端mountd会根据 /etc/exports 将其转换为服务器内部的文件句柄（File Handle, fh）。

- **步骤2：服务器处理请求**
  
  - 服务器需要预先配置共享目录：在服务器的 /etc/exports 文件中(这仅是服务器端的配置文件，实际生效需要执行 exportfs -a 或重启 nfs-server 服务)添加`/users/paul 192.168.1.0/24(rw,sync)`
  
  - `/etc/exports`文件格式：共享目录 客户端IP或网络(选项)
  
  - 选项`sync`的深层含义：该选项强制服务器在将数据写入磁盘后才返回成功（对应表中 WRITE 的返回）。虽然保证了数据一致性，但会大幅降低写入性能；如果为了性能改用 async，则可能在断电时丢数据。

- **步骤3：建立连接**
  
  - 客户端 ↔ 服务器
  
  - 通过RPC协议建立通信通道，这实际上是两个过程：
    
    - 第一部分（获取端口）：客户端先访问 Portmap/RPCBIND（端口映射器，程序号100000），询问服务器mountd和NFS服务（nfsd）分别监听在哪个端口（因为mountd端口是动态的）。
    
    - 第二部分（获取根文件句柄）：客户端向mountd发起 MOUNTPROC_MNT 请求，服务器校验通过后，返回该共享目录的“根文件句柄（root fh）”给客户端。客户端将这个fh与本地挂载点 /home/paul 绑定。

<img src="images/2026-08-22-13-49-15-image.png" alt="" width="777">

某种意义上，NFS client可以想象为一个OS组件。它需要让application在不修改代码的情况下运行。它会通过网络挂载连接到NFS Server，然后完成传输和处理。

在两次NFS server处理之间的时间Server崩溃或者重启不会带来Client的影响。这被称为“stateless”无状态设计。这里的无状态是对于Server而言而不是Client。这就要求Server端不能存储有关Client的信息。

在这种情况下，每个RPC请求，需要满足：

- 每个远程过程调用包含所有必要信息

- 服务器不需要维护客户端会话状态

- 请求之间相互独立

## 4 File handler

由于是无状态的服务，Server不存储任何Client的信息，因此也不能有对应的FD table，因此也不能像常规的文件系统那样直接使用fd。因此，我们需要设计file handler。（本质原因在于，FD的含义依赖于本机内核维护的状态，很难在多机器之间交互）

- **思路1：Path name方案**
  
  - 需要在server单独记录文件路径，改变文件名和路径变化都会带来很麻烦的后果
  
  - 不利于stateless的设计需要，而且效率偏低

- **思路2：Inode number方案**
  
  - 直接使用问题很多，比如inode number可能被复用（服务器旧文件被删除回收，服务器的新文件用了原来的旧文件inode number，造成根据inode number拿到的数据和预期不一致）

实际上，一般的思路是使用**generation Numer**（版本号）和inode number协作完成：

- 可以理解成，FH = (inode number, generation number)

- 对于上述问题的规避：

```
File A:
inode = 12345
generation = 7
FH = (12345, 7)

Delete File A

File B:
inode = 12345
generation = 8
FH = (12345, 8)

Client:(12345, 7)


Server check:
inode 12345 exists
    ↓
current generation = 8
    ↓
FH generation = 7
    ↓
Not the target file!
    ↓
STALE
```

## 5 Performance Overhead

NFS通常比本地文件系统慢，但不总是如此，这取决于File server performance & network speed，即服务器性能和网络速度。

由于远端操作和RPC调用的时间开销比较大，因此需要利用cache at client降低远端操作数量。

Server端的Cache通过buffer cache自动完成。

Client的Cache可能遇到一些问题，主要是一致性问题：

- **Close-to-open consistency:** 
  
  - OPEN时，和缓存数据对比是否一致，如果一致则认为没有被修改过。如果不一致则从远端读取。
  
  - CLOSE时把本地的Cached writes全部发送给远端服务器。
  
  - 这种策略语义简单，性能很好。但是在处理复杂的schedule依旧存在问题。在文件未关闭之前，其他客户端无法看到修改，因此不适合需要实时共享的场景。
  
  - 在关闭文件时，将缓存中的数据刷新（flush）到服务器。如果数据块被修改，则被标记为脏（dirty），然后在文件关闭时刷新。

<img src="images/2026-08-22-14-56-37-image.png" alt="" width="422">

- **Read/Write Coherence:**
  
  - 在Client本地，READ得到最新数据。服务器和客户端都保存文件的时间戳（最后修改时间）。
  
  - 当打开文件或客户端与服务器联系时：
    
    - 比较客户端缓存中的最后修改时间和服务器上的最后修改时间。
    
    - 如果服务器上的版本更新（时间戳更晚），则使客户端缓存中的数据失效，从服务器重新获取。
    
    - 另外，即使没有打开操作，也会定期使缓存数据失效：打开的文件每3秒使缓存失效（即每3秒检查一次服务器是否更新），目录每30秒使缓存失效。
  
  - 客户端在读取文件之前，先检查缓存是否过期（通过比较时间戳）。如果缓存过期，则从服务器获取最新数据。定期（3秒对于打开的文件，30秒对于目录）主动使缓存失效，以确保不会长时间使用过期数据。
  
  - 优点：
    
    - 可以保证每次读取都拿到比较新的数据
    
    - 通过对比时间戳减少不必要的数据传输（只有当数据确实被修改时才重新获取）
  
  - 缺点：
    
    - 仍然存在一个时间窗口（3秒/30秒），在此期间客户端可能读取到过期数据。
    
    - 频繁的时间戳检查可能会增加服务器负载（尽管比传输整个文件要轻量）。

**NFS的Server无状态的代价就是无法“仲裁”，需要额外设计机制解决一致性问题。**

## 6 Chunks Size

- 传输基本单位大小为chunks，即单次RPC请求携带的最大数据量。一般默认4KB/8KB/1MB

- 采用更大的chunks可以在传输大文件时减少建立连接的次数，从而减少额外的时间成本。大块数据能让底层TCP/IP充分启用窗口缩放（Window Scaling）和巨型帧（Jumbo Frame），减少协议头占比。

- 但是也不是越大越好，块越大，最后一块的尾部延迟（Tail Latency）越明显。若网络丢包，重传整个大块的成本远高于小块。超大块（如64MB）会长时间占用服务器内存池和网络中断，降低多客户端并发时的响应性。并且NFS依赖Checksum（校验和）（TCP/IP校验和或RPC校验），块越大，单次Checksum计算耗时越长，可能成为CPU瓶颈。

## 7 Read-ahead 优化策略

缓存解决的是“时间局部性”（刚用过的数据再用），而预读解决的是“空间局部性”（当前位置附近的数据即将被用）。

这是一系列预读取策略，比如：

- **顺序流检测**：记录上一次读操作的结束偏移量 last_end。当新的 read() 请求到来时，比较起始偏移量 start。
  
  - 若 start == last_end（严格连续），判定为顺序流，立即激活预读；
  
  - 若 start 略大于 last_end（中间有少量间隔，比如被元数据打断），多数策略会采用容忍阈值（如允许 128KB 内的跳跃），仍视为顺序流，避免频繁关闭预读。
  
  - 若 start 大幅回退或随机跳动，则标记为随机访问，彻底关闭预读（或仅做单页预读）。

- **自适应窗口拓展：** 一旦判定为顺序流，系统需要决定单次预读的块大小（Window Size）。Linux 内核中的经典策略是“倍增+封顶”：
  
  - 初次预读较小值，避免误判的浪费
  
  - 如果后续请求命中之前预读的数据，说明预测正确，下一次预读窗口翻倍或者扩展，直到达到预设的最大值。
  
  - 策略会参考底层磁盘的条带大小（Strip Size）或 NFS 服务器的 rsize，将预读大小对齐到整数倍，避免产生过多碎片 RPC。

- **异步流水线和前瞻性策略：**
  
  - 在 NFS 的高延迟网络环境下，单纯加大窗口不够，因为等待单个大块数据返回时，网络依然可能空闲。
  
  - **多并发预读（Concurrent Prefetch）：** 客户端在发起一个预读 RPC 后，不等其返回，立即根据窗口大小发起后续第二个、第三个 RPC 请求（类似 TCP 的滑动窗口）。
  
  - **策略核心**：保持“飞行中（In-flight）”的预读请求数量恒定（通常为 2~4 个）。这样即使第一个预读包因网络抖动延迟，后续数据也已陆续到达，确保应用层 `read()` 调用永远不需要阻塞等待磁盘/网络。

核心哲学是 **“乐观尝试，谨慎扩容，快速止损”**。

## 8 VFS：Virtual File System

- 来自OS Kernel的统一文件系统抽象层，相当于是对于各种文件系统的统一特征提取抽象，给上层程序提供一套统一的“文件系统接口”，下面再对接 ext4、NTFS、NFS、FAT、tmpfs 等各种不同的文件系统。

- 因为一个OS可能有不同的File System，底层实现可能相差巨大，但是实际操作需求可能类似（比如读写文件、删除文件等操作），若没有VFS，从底层去依次实现不同文件系统的IO接口（如Read、write、open）会很麻烦，系统调用都得分别处理每一种文件系统

- VFS 作用示意图：

```
                 用户程序
                    │
             open/read/write
                    │
                    ▼
              ┌───────────┐
              │      VFS             │
              └───────────┘
                    │
        ┌────────────┐
        ▼           ▼           ▼
      ext4         NFS         tmpfs
```

- 核心作用：**向上提供统一接口，向下屏蔽具体文件系统的实现差异。**

## 9 GFS：Google File System

- GFS是Google开发的文件系统，今天实际使用不多，但是对于分布式文件系统的发展意义极其重大。Google做搜索引擎时发现，自己不能随意删除文件，而且面临的、需要处理的文件数量和占用空间都很大。

- 设计的基本要求来说，写操作几乎全是append，workload几乎是read，因为是面向服务搜索引擎。Google的目标是可扩展的分布式文件系统。

- GFS不提供标准的OS-level API，而是自己的user-level API。

| 操作类型                     | 具体API                               |
| ------------------------ | ----------------------------------- |
| Basic operations         | create/delete/open/close/read/write |
| Addtional operations     | snapshot/append                     |
| Not Supported operations | link/symlink/rename                 |

### 9.1 基本结构

<img src="images/2026-08-22-15-43-44-image.png" alt="" width="549">

一台机器作为master，然后还有若干台chunk server。chunk的大小大于普通的文件系统，因为GFS往往用于大型文件系统。Master用于负责告知Client需要的数据在哪里，本身不会直接传输数据给client。

<img src="images/2026-08-22-16-01-36-image.png" alt="" width="494">

- 每个file被放在chunk里面，一个文件会存在3备份；对于热度很高（popular）的file可能不止3备份，因为需要避免热点访问的瓶颈。

- chunks设计较大的益处有，master可以将所有元数据存放在内存中（所有元数据都存储在主节点（master）的内存中，从而实现极快的访问速度），因为块数量减少后元数据量也相对较小。此外，块增大可以避免过度频繁通信，不需要频繁请求块位置信息，使得长时间保持TCP链接成为可行（TCP建立连接的代价比较高）

- 文件名到块（chunk）的映射表（例如使用内存中的树结构）存放在master的内存中，同时也会以操作日志（operation log）的形式持久化到磁盘。块 ID 到块位置（chunk location）的映射表也存储在master内存中，但不需要写入日志，因为这些信息会在系统启动时从所有 chunkserver 查询获取。

- 主节点负责所有管理操作，因此可以保证这些信息实时保持最新状态。

- GFS、类GFS文件系统在面临海量小文件和碎片文件的时候性能会极大恶化，因为每个文件、每个块的位置映射都在master的内存里占有一席之地。这会极大占用master的资源。

### 9.2 Rename问题

- 一般不支持常规的rename（POSIX语义下的rename）操作原因：
  
  - 会带来一致性和冲突问题。GFS的Master管理全文件系统的命名空间，在执行rename时，Master必须同时锁定“源路径”和“目标路径”的父目录，以防止在移动过程中有并发操作创建同名文件。
  
  - 如果允许任意跨目录重命名（如将 /dir_a/file 移到 /dir_b/file），Master需要获取多个目录的读写锁。如果两个客户端同时发起交叉重命名（A移动到B，B移动到A），加锁顺序不当就会引发死锁（Deadlock）。
  
  - 为了绝对避免死锁，GFS的Master采用了确定性锁顺序——它严格按照命名空间中目录的层级深度（或字典序）依次加锁。
  
  - 但是这会带来巨大的时间代价，而且这会显著增加元数据、一致性和同步机制的复杂度。因为GFS往往管理的文件数极多，文件层级可能很深，逐层获取锁会长时间阻塞操作，因此实际上一般严格限制大规模的数据迁移和跨目录移动，更多是同一个父目录下的“Rename”。
  
  - POSIX标准下，Rename（A，B）操作若B存在则会自动删除B并覆盖，但是GFS极力避免这种覆盖式命名，因为GFS中的文件在写入时，会由Master授予租约（Lease）给持有最新数据块位置的Chunk（块）服务器。如果目标文件 B 当前正被某个客户端打开写入（持有租约），此时执行覆盖重命名，Master必须立即撤销该文件的租约，并通知Chunk服务器停止写入。由于Master与Chunk服务器之间是心跳（Heartbeat）通信，撤销租约有延迟。如果允许高频的覆盖重命名，Master会频繁陷入“吊销租约-修改元数据-同步日志”的沉重流程中，极大地拖累整个集群的吞吐量。
  
  - 此外，GFS的snapshot、log设计也对于常规的rename并不友好。

### 9.3 GFS读操作

读操作无需租约（Lease），无需经过Primary副本，任意持有最新版本的副本均可响应。这使得GFS的读操作完全无状态，读扩展性极佳，且不影响写入的串行化逻辑。

**① 客户端计算Chunk索引**

- 利用固定块大小（**64MB**），通过公式 `Chunk_Index = Offset / 64MB` 定位目标Chunk。

- 同时计算块内偏移量（`Offset % 64MB`）。

**② 获取元数据（Master交互）**

- 客户端向Master发起请求：`Lookup(filename, Chunk_Index)`。

- Master返回三要素：**Chunk Handle（唯一句柄）**、**版本号（Version Number）**、**副本位置列表（IP列表）**。

- **缓存机制**：客户端会缓存 `<文件名+索引> -> <句柄+位置+版本号>` 的映射。后续读取同一位置时，**直接跳过Master**。

**③ 副本选择（机架感知）**

- Master返回的IP列表**已按网络拓扑排序**（优先同机架，其次同数据中心）。

- 客户端优先选择**距离最近**的Chunkserver发起请求，以降低跨交换机带宽消耗和延迟。

- *注：这里的“最近”仅针对读数据流，与写入时决定Primary的逻辑完全解耦。*

**④ 数据读取与强校验**

- 客户端直连Chunkserver，发送：`Read(Chunk_Handle, Offset_in_Chunk, Size)`。

- Chunkserver从磁盘（或Page Cache）读取数据后，**必须计算该数据块的校验和（Checksum）**。
  
  - 若校验匹配 → 返回数据给客户端。
  
  - 若校验失败（磁盘静默损坏） → **不返回错误数据**，向客户端报错。

**⑤ 容错回退与自愈**

- 客户端收到校验失败报错后，**立即放弃当前副本**，转而尝试位置列表中的**下一个IP**（重试步骤④）。

- 同时，客户端**异步向Master报告**该副本已损坏。

- Master收到报告后，**将该副本标记为无效**，并调度新的Chunkserver从其他健康副本复制数据，以恢复目标副本数（通常为3）。

### 9.4 GFS写操作

一般GFS的多备份副本，备份**事先定义**分为1个primary和多个secondaries（**一般来说，优先选择版本号最高、磁盘空间充足、实例负载较低的。通常在Chunk创建时，或者当前的Primary宕机/租约过期时，Master会从该Chunk的所有存活副本（Chunkserver）中挑选一个作为Primary**）

- 首先，进行data-deliver，数据被传输但是不是正式的写入。

- Client连接master，请求并且获得对应目标文件的位置（分布在哪些chunkserver上、哪个是主备份、这些机器对应的IP）

<img src="images/2026-08-22-16-45-09-image.png" alt="" width="756">

- **流水线推送**，client把需要写入的内容分割成数据包，推送给距离上最靠近的副本（可以是主副本，也可以是其他副本），该chunkserver收到后立刻转发数据包给下一个chunkserver直到所有有对应文件的chunkserver全部接收到，以此类推（类似于A→B→C→···）；**这个过程不需要阻塞等待，不需要等待发送者接收到接收者的回应才继续发送，而是流水线式的持续转发，这极大地利用了网络全带宽，避免了RPC（远程过程调用）往返延迟。**

<img src="images/2026-08-22-16-46-52-image.png" alt="" width="757">

- 此时所有副本（A、B、C）的内存中都已经缓存了这批数据，但尚未写入磁盘。

- 当确认所有的chunkserver均确认数据全部接收到对应数据包（ACK）后，client发送正式的**写入请求**给主副本所在的chunkserver

<img src="images/2026-08-22-16-48-26-image.png" alt="" width="752">

- **主副本串行化**：主副本的chunkserver收到请求后，按到达顺序为本次写入分配一个全局唯一的序列号（Sequence Number）。这是为了保证多个客户端同时写入时，所有副本上的数据顺序完全一致。

- **二次提交：** 主副本chunkserver携带序列号的写入命令发送给所有其他副本chunkserver，这些chunkserver严格按照这个序列号，把内存的对应数据包写入磁盘。

<img src="images/2026-08-22-16-49-54-image.png" alt="" width="761">

- **所有其他次要副本chunkserver需要给主副本chunkserver回复“写入成功”，然后主副本chunkserver才能告知client已经写入成功（ACK）**

<img src="images/2026-08-22-16-50-44-image.png" alt="" width="758">

<img src="images/2026-08-22-16-51-18-image.png" alt="" width="759">

## 10 Alias 机制问题

- GFS不像大多数文件系统那样为每个目录维护单独的数据结构。例如，在传统文件系统中，一个目录文件会包含该目录下所有文件的名称。

- 没有别名（alias）机制，也就是说不支持hard link / symbolic link。整个命名空间（namespace）只是一个单一的查找表（lookup table），用于将路径名（pathname）映射到文件的元数据（metadata）。
