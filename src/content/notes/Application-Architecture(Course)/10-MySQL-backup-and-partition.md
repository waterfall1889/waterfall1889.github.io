---
title: MySQL Backup and Partition
category: Course
tags: [MySQL, Backup, Partition, Replication, Application Architecture]
date: 2025-10-02
---

# MySQL Backup and Partition

## 1 MySQL 备份

### 1.1 物理备份与逻辑备份

**物理备份（原始备份）：**

- 直接复制数据目录、数据文件、日志等物理文件
- 恢复快，适合大型库与灾难恢复

**逻辑备份：**

- 保存逻辑结构与内容（如 `CREATE` / `INSERT`，或分隔文本）
- 可编辑、利于跨平台迁移与选择性恢复；更适合中小数据量

### 1.2 在线 / 离线与热冷暖备份

| 类型 | 含义 |
| --- | --- |
| **在线备份** | 服务器运行中备份；需适当锁定以保证一致性；高可用场景常用 |
| **离线备份** | 停服备份；无并发写入干扰，但客户端不可用；常在副本上做 |
| **热备份** | 在线，备份期间仍可能允许修改（配合锁定） |
| **冷备份** | 离线，无修改 |
| **暖备份** | 服务仍运行，但库文件被锁住防改，可对外访问文件 |

### 1.3 本地与远程、快照

- **本地备份**：在数据库主机上执行；如本地 `mysqldump`、`SELECT ... INTO OUTFILE`
- **远程备份**：从其他主机连接备份；可把备份落到异地
- **快照备份**：依赖文件系统快照（LVM / ZFS / Veritas 等），多用 copy-on-write；MySQL 本身不提供快照

快照示意流程（Veritas 一类）：

1. `FLUSH TABLES WITH READ LOCK`
2. 打文件系统快照
3. `UNLOCK TABLES`
4. 从快照复制文件后卸载快照

### 1.4 完整备份与增量备份

- **完整备份**：某一时刻的全量数据，恢复简单，占空间大
- **增量备份**：只备份一段时间的变更；常依赖 **二进制日志**；恢复需“全量 + 后续增量”

调度、压缩、加密：

- 定时调度减少人为遗漏
- 可用企业备份压缩，或 `gzip` 等工具
- 可用 `OpenSSL` 等加密备份文件

### 1.5 常用备份手段

**mysqldump（社区逻辑备份）：**

- 生成 SQL；InnoDB 可用 `--single-transaction` 做在线备份，尽量少锁表
- 备份期间其他客户端通常可读

**复制表文件：**

- 复制 `*.MYD` / `*.MYI` / `*.sdi` 等
- 需停服，或锁表并 `FLUSH` 后再拷
- **不适用于 InnoDB**（数据可能仍在内存未刷盘）

**二进制日志增量：**

1. 需要增量时 `FLUSH LOGS` 轮换 binlog
2. 下次全量也可用 `FLUSH LOGS` 或 `mysqldump --flush-logs`

**在副本上备份：**

- 减轻对主库影响
- 需一并备份副本的连接 / 应用元数据仓库；若有 `LOAD DATA`，还要注意相关 `SQL_LOAD-*` 文件

**损坏表修复（MyISAM）：**

- `REPAIR TABLE` 或 `myisamchk -r`，多数情况下可修

### 1.6 备份类型与导出工具对比

| 备份类型 | 特点 | 适用 |
| --- | --- | --- |
| **完整备份** | 全量，恢复简单 | 定期全量 |
| **增量备份** | 只记变更，省空间 | 频繁备份 |
| **二进制日志恢复** | 按变更重放 | 追到更近时间点 |
| **自动恢复（InnoDB）** | 崩溃后回滚未提交、重做已提交 | OS 崩溃 / 掉电 |

| 工具 | 特点 | 适用 |
| --- | --- | --- |
| **MySQL Shell 导出** | 并行、压缩、进度、云相关能力 | 大规模导出 |
| **mysqldump SQL** | SQL 语句，易迁移 / 选择性恢复 | 中小库逻辑备份 |
| **mysqldump 分隔文本** | `.sql` + `.txt` | 快速导入导出 |

### 1.7 时间点恢复（Point-in-Time Recovery）

1. 先恢复完整备份，回到备份时刻
2. 再用二进制日志增量追到目标时间点

常用命令：

```sql
SHOW BINARY LOGS;
SHOW MASTER STATUS;
```

```bash
mysqlbinlog binlog_files | mysql -u root -p
```

若 binlog 已加密（MySQL 8.0.14+），`mysqlbinlog` 可能无法直接读本地文件，需 `--read-from-remote-server`（`-R`）从服务器读取。

### 1.8 Primary–Secondary 与复制

- **Primary**：唯一写节点，数据权威来源
- **Secondary**：复制 Primary，通常只读；用于备份、读扩展、故障切换
- 核心：修改先落 Primary，再同步 / 异步到 Secondary

**同步复制：**

- 写完 Secondary 后才向客户端返回
- 一致性强，故障丢数少；写延迟高，从库异常可能拖慢整体
- 适合金融等强一致场景

**异步复制：**

- Primary 先返回，后台再复制
- 写性能好；Primary 宕机可能丢未复制数据
- 互联网业务更常见

典型用途：容灾、读写分离、在线升级前提升 Secondary。

**Failover：**

- 手动切换：稳但慢
- 自动切换：依赖监控与仲裁（ZooKeeper / Raft / Etcd 等）；设计不当可能脑裂

## 2 MySQL 分区

### 2.1 概述

- 数据量大时常用分区
- 实践中多见 **InnoDB** 分区
- **水平分区**：按行拆到不同物理分区
- **垂直分区**：按列拆表；**MySQL 8.0 不支持**真正的垂直分区

主要好处：

- 单表可跨磁盘 / 文件系统承载更大体积
- 删分区可快速丢掉历史数据，加分区便于承接新数据
- 查询可自动或显式做分区裁剪，少扫无关分区

### 2.2 分区方案

#### RANGE

按列值范围入分区：

```sql
CREATE TABLE members (
  firstname VARCHAR(25) NOT NULL,
  lastname VARCHAR(25) NOT NULL,
  username VARCHAR(16) NOT NULL,
  email VARCHAR(35),
  joined DATE NOT NULL
)
PARTITION BY RANGE(YEAR(joined)) (
  PARTITION p0 VALUES LESS THAN (1960),
  PARTITION p1 VALUES LESS THAN (1970),
  PARTITION p2 VALUES LESS THAN (1980),
  PARTITION p3 VALUES LESS THAN (1990),
  PARTITION p4 VALUES LESS THAN MAXVALUE
);
```

#### LIST

按离散值集合入分区；匹配不到会报错：

```sql
CREATE TABLE members (
  firstname VARCHAR(25) NOT NULL,
  lastname VARCHAR(25) NOT NULL,
  username VARCHAR(16) NOT NULL,
  email VARCHAR(35),
  joined DATE NOT NULL
)
PARTITION BY LIST(YEAR(joined)) (
  PARTITION p0 VALUES IN (1960, 1970, 1973),
  PARTITION p1 VALUES IN (1980, 1990)
);
```

#### HASH

按用户表达式的哈希值选分区：

```sql
CREATE TABLE members (
  firstname VARCHAR(25) NOT NULL,
  lastname VARCHAR(25) NOT NULL,
  username VARCHAR(16) NOT NULL,
  email VARCHAR(35),
  joined DATE NOT NULL
)
PARTITION BY HASH(YEAR(joined))
PARTITIONS 6;
```

#### KEY

类似 HASH，但使用 MySQL 自带哈希（常基于主键相关列）：

```sql
CREATE TABLE members (
  firstname VARCHAR(25) NOT NULL,
  lastname VARCHAR(25) NOT NULL,
  username VARCHAR(16) NOT NULL,
  email VARCHAR(35),
  joined DATE NOT NULL
)
PARTITION BY KEY(joined)
PARTITIONS 6;
```

### 2.3 COLUMNS 分区

RANGE / LIST 的变体：分区键可用多列，且可用于分区裁剪。

支持类型大致包括：

- 整数：`TINYINT` … `BIGINT`
- 日期：`DATE`、`DATETIME`
- 字符串：`CHAR` / `VARCHAR` / `BINARY` / `VARBINARY`

不支持作分区列的常见类型：`TEXT` / `BLOB`，以及 `DECIMAL` / `FLOAT` 等。

### 2.4 子分区

分区后仍过大时，可对每个分区再划分子分区（复合分区）：

```sql
CREATE TABLE ts (id INT, purchased DATE)
  PARTITION BY RANGE(YEAR(purchased))
  SUBPARTITION BY HASH(TO_DAYS(purchased))
  SUBPARTITIONS 2 (
    PARTITION p0 VALUES LESS THAN (1990),
    PARTITION p1 VALUES LESS THAN (2000),
    PARTITION p2 VALUES LESS THAN MAXVALUE
  );
```

上例：3 个 RANGE 分区 × 每区 2 个子分区 = 6 个实际分区。

### 2.5 NULL 的处理

| 分区类型 | `NULL` 行为 |
| --- | --- |
| **RANGE** | 进入最低分区 |
| **LIST** | 未显式包含 `NULL` 则报错；可设 `VALUES IN (NULL)` 的专门分区 |
| **HASH / KEY** | 按 0 处理，通常落到分区 0 |
