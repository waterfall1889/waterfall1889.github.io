---
title: GraphQL
category: Course
tags: [GraphQL, gRPC, API, Application Architecture]
date: 2025-10-26
---

# GraphQL

## 1 通信方案背景

前后端常见通信方案各有取舍：

- **SOAP**：标准化程度高、可靠，但设计复杂，和 API 绑定深，重构困难
- **RESTful**：用 URL 表示路径，JSON 传数据；容易产生冗余字段，浪费带宽
- **前后端交互的两条思路**：
  - 后端按 ER 设计，把整份数据发给前端解析：简单易维护，但冗余多
  - 按用户需求驱动设计实体（DTO）：按需取数，但 DTO 数量容易激增，维护成本高

## 2 GraphQL 是什么

GraphQL 用于缓解上述前后端交互矛盾：

- 允许客户端声明自己需要的数据，由服务端按需返回，减少大量 DTO
- 前端与后端之间通过查询结构形成“契约”

查询示例：

```graphql
{
  me {
    name
  }
}
```

可能返回：

```json
{
  "me": {
    "name": "Luke Skywalker"
  }
}
```

### 2.1 与 REST 的对比

| | REST | GraphQL |
| --- | --- | --- |
| API 组织 | 多个 Endpoint | 通常一个 GraphQL Endpoint |
| 数据需求 | 服务端决定 | 客户端声明 |
| 数据冗余 | 可能较多 | 通常更少 |
| 请求次数 | 复杂页面可能多次请求 | 可一次嵌套查询 |
| 类型系统 | 不一定严格 | 强类型 Schema |
| API 契约 | OpenAPI 等 | GraphQL Schema |
| 缓存 | HTTP 缓存较自然 | 更复杂 |
| 文件下载 | 很自然 | 通常不适合 |
| 实时通信 | WebSocket / SSE 等 | Subscription 等 |
| 复杂度 | 相对简单 | 服务端复杂度较高 |

## 3 GraphQL 核心特性

### 3.1 字段（Fields）

- 查询可以沿对象关系遍历相关字段
- 一次请求即可拿到多份关联数据，而不必像经典 REST 那样多次往返

### 3.2 参数（Arguments）

- 字段和嵌套对象都可以带自己的参数
- 用参数精确控制返回内容，可替代多次 API 拉取

### 3.3 别名（Aliases）

- 给字段起不同名称
- 解决同名字段冲突（例如两个 `hero`）
- 便于在一次请求中拿到多组结果，并提高可读性

### 3.4 片段（Fragments）

- 把一组字段抽成可复用片段，在查询中按需引入
- 减少重复定义；改字段时通常只需改一处，复杂查询更易组织

### 3.5 变量（Variables）

- 把动态值从查询中抽离，作为单独字典传入
- 避免在查询字符串中硬编码；有利于复用，也有助于降低注入风险

### 3.6 变更（Mutations）

- 用于修改数据的操作；技术上查询也能写成会写库，但变更是明确的写入口
- 例如 `createReview` 可在创建后直接返回 `stars`、`commentary` 等字段
- 一次操作既能改数据，又能取回更新后的结果，减少额外查询

### 3.7 内联片段（Inline Fragments）

- 查询返回接口（Interface）或联合类型（Union）时，用内联片段访问具体类型字段
- 可按类型返回不同字段，并保持类型安全

### 3.8 Schema

GraphQL 是强类型 API，服务端用 Schema 定义整个 API 能提供什么：

```graphql
type User {
  id: ID!
  name: String!
  age: Int
}

type Query {
  me: User
  user(id: ID!): User
}
```

Schema 规定：

- 有哪些类型（Type）
- 有哪些字段（Field）
- 字段是什么类型
- 哪些字段可以查询
- 参数是什么类型
- 哪些操作可以执行

可以把它看成 GraphQL API 的**类型化契约**。

### 3.9 Resolver

- Schema 描述“能要什么数据”
- Resolver 决定“这些数据从哪里来、怎么得到”

典型路径：

```text
Query.me
  → Resolver
  → User Service
  → Database
```

对应关系：

- **Schema**：API 的结构 / 契约
- **Resolver**：获取或计算数据的实际逻辑

### 3.10 三种 Operation

GraphQL 主要有三类操作：

- **Query**：读取数据
- **Mutation**：修改数据
- **Subscription**：订阅实时数据

Subscription 示例：

```graphql
subscription {
  messageAdded {
    id
    content
  }
}
```

服务端产生新事件时，客户端可持续收到数据。常见场景：聊天、实时通知、行情推送、实时协作。

## 4 gRPC

gRPC 也是一种前后端（或多服务）通信方式。

- GraphQL 多用 JSON，存在冗余；gRPC 倾向二进制传输，并可压缩
- 客户端可有 stub，支持多语言自动生成
- 不同语言之间也可通过二进制协议通信
- 协议 / 契约写在 `.proto` 文件中
- 通信单位称为 message
- 二进制数据进入 buffer，压缩后可按批次 / 流式传输，速度较快

### 4.1 四种服务方法类型

#### 一元 RPC（Unary RPCs）

- 客户端发单个请求，收到单个响应
- 类似普通函数调用的请求-响应模式
- 适合简单查询

#### 服务器流式 RPC（Server Streaming RPCs）

- 客户端发一个请求，再从流中读取一系列消息，直到结束
- 单次 RPC 内消息顺序有保证
- 适合服务端持续推送

#### 客户端流式 RPC（Client Streaming RPCs）

- 客户端通过流写入一系列消息发给服务端
- 写完后等待服务端读取并返回响应
- 单次 RPC 内消息顺序有保证
- 适合客户端持续上传

#### 双向流式 RPC（Bidirectional Streaming RPCs）

- 双方各自使用读写流发送一系列消息
- 两路流相对独立，读写顺序可灵活组合
  - 例如服务端等收齐客户端消息再回写
  - 或读写交替进行
- 每个流内消息顺序保留
- 适合聊天、实时协作等双向通信

### 4.2 同步与异步调用

#### 同步 RPC

- 阻塞直到收到服务端响应
- 最接近“像本地过程调用”的抽象
- 适合必须拿到结果才能继续的场景

#### 异步 RPC

- 网络本身是异步的
- 可不阻塞当前线程就发起 RPC，有利于并发与资源利用
- 许多场景下更合适

gRPC 编程 API 在多数语言中同时提供同步与异步风格，可按需求选择。
