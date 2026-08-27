---
title: DFS:Distributed File System
category: Course
tags: [Distributed System, Storage, Network]
date: 2025-11-10
---

# Distributed File System

## 1 FTP file system

FTP 文件系统是一个依托于网站的简单文件系统，实现了文件的下载和上传。这也是一种最简单的分布式文件系统和网络文件系统之一。

<img title="" src="../images/Computer-System-Engineering(Course)/Distributed file system (DFS)/2026-08-22-16-51-18-image.png" alt="" width="759">

## 10 Alias 机制问题

- GFS不像大多数文件系统那样为每个目录维护单独的数据结构。例如，在传统文件系统中，一个目录文件会包含该目录下所有文件的名称。

- 没有别名（alias）机制，也就是说不支持hard link / symbolic link。整个命名空间（namespace）只是一个单一的查找表（lookup table），用于将路径名（pathname）映射到文件的元数据（metadata）。
