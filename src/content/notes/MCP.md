---
title: MCP:Model Context Protocol
category: tech
tags: [LLM, Agent]
date: 2026-07-30
---
# MCP:Model Context Protocol

---

## 1 MCP是什么

MCP （Model Context Protocol，模型上下文协议）定义了应用程序和 AI 模型之间交换上下文信息的方式。这使得开发者能够**以一致的方式将各种数据源、工具和功能连接到 AI 模型**（一个中间协议层），就像 USB-C 让不同设备能够通过相同的接口连接一样。MCP 的目标是创建一个通用标准，使 AI 应用程序的开发和集成变得更加简单和统一。

![](images/2026-08-06-17-21-47-image.png)

MCP 就是以更标准的方式让 LLM Chat 使用不同工具

## 2 Function call and tool call

### 2.1 Function call

这是 **模型能力层（Model-level capability）**，模型输出一个结构化的指令，让外部的程序去执行某个函数。

- LLM = “决定调用哪个函数 + 传什么参数”

- 真正执行在外部代码里

- OpenAI / Claude / Gemini 都支持类似机制

- 强约束 schema（JSON schema）

- 解决“模型不会做计算/查数据库/调API”的问题

```json
{
  "name": "get_weather",
  "arguments": {
    "city": "KL"
  }
}
```

### 2.2 Tool call

**更通用的应用层抽象（Agent-level abstraction）**

可以理解为Function call 的“升级版 / 泛化版”

**Tool Call 的特点**

- 不只函数，而是“能力单元”
- 可以是多步骤系统
- 可以带状态
- 可以组合

一个 Tool 可以是：

- API调用（search、weather）
- 数据库查询
- Python执行
- 文件操作
- 浏览器操作
- RAG检索
- MCP server能力

### 2.3 层次关系

```
LLM
 ↓
Function Call（原始能力：调用函数）
 ↓
Tool Call（泛化能力：调用各种工具）
 ↓
MCP（统一协议：让工具标准化接入）
```

## 3 为何我们需要MCP

 MCP 的出现是 prompt engineering 发展的产物。更结构化的上下文信息对模型的 performance 提升是显著的。我们在构造 prompt 时，希望能提供一些更 specific 的信息（比如本地文件，数据库，一些网络实时信息等）给模型，这样模型更容易理解真实场景中的问题。

随着我们要解决的问题越来越复杂，**手工**把信息引入到 prompt 中会变得越来越困难。

而现有的方案中，`function call`存在很多局限性：

- **标准碎片化**：平台依赖严重，每个模型厂商自定义一种 tool schema，格式存在不同，迁移到其他模型的成本非常高

- **上下文理解能力不足**：工具 = API，Function call 假设工具是一个 function（输入→输出），但是实际上，DB查询、RAG、文件系统等等任务都是需要“stateful”的，简单的函数调用会压缩问题

- **上下文注入困难**：Function call 没有统一“上下文拼装机制”

- **交互模型往往是单步的**：LLM → tool → LLM的流程不适合复杂的需要多轮 tool chaining /tool composition的场景

MCP 不是“更好的 function call”，而是**Tool + Context + State 的统一协议层**

- **生态** - MCP 提供很多现成的插件，你的 AI 可以直接使用。
- **统一性** - 不限制于特定的 AI 模型，任何支持 MCP 的模型都可以灵活切换。
- **数据安全** - 你的敏感数据留在自己的电脑上，不必全部上传。（因为我们可以自行设计接口确定传输哪些数据）

## 4 MCP架构



整个MCP主要有三部分：

- **Host**：Claude Desktop 作为 Host，负责接收你的提问（“桌面文档有哪些？”）并与 Claude 模型交互。

- **Client**：当 Claude 模型决定需要访问你的文件系统时，Host 中内置的 MCP Client 会被激活。这个 Client 负责与适当的 MCP Server 建立连接。

- **Server**：对应MCP Server 会被调用。它负责执行实际的文件扫描操作，访问你的桌面目录，并返回找到的文档列表。

```
你的问题 
→ Claude Desktop(Host) 
→ Claude 模型 
→ 需要文件信息 
→ MCP Client 连接 
→ 文件系统 MCP Server 
→ 执行操作 
→ 返回结果 
→ Claude 生成回答 
→ 显示在 Claude Desktop 上
```

这种架构设计使得 Claude 可以在不同场景下灵活调用各种工具和数据源，而开发者只需专注于开发对应的 MCP Server，无需关心 Host 和 Client 的实现细节。

## 5 工具选择

**模型如何确定该使用哪些工具？** 这里以 MCP 官方提供的 client example 为示例，并简化了对应的代码（删除了一些不影响阅读逻辑的异常控制代码）。通过阅读代码，可以发现模型是通过 prompt 来确定当前有哪些工具。我们通过 **将工具的具体使用描述以文本的形式传递给模型**，供模型了解有哪些工具以及结合实时情况进行选择。

```python
 ... # 省略了无关的代码
 async def start(self):
     # 初始化所有的 mcp server
     for server in self.servers:
         await server.initialize()
 ​
     # 获取所有的 tools 命名为 all_tools
     all_tools = []
     for server in self.servers:
         tools = await server.list_tools()
         all_tools.extend(tools)
 ​
     # 将所有的 tools 的功能描述格式化成字符串供 LLM 使用
     # tool.format_for_llm() 我放到了这段代码最后，方便阅读。
     tools_description = "\n".join(
         [tool.format_for_llm() for tool in all_tools]
     )
 ​
     # 这里就不简化了，以供参考，实际上就是基于 prompt 和当前所有工具的信息
     # 询问 LLM（Claude） 应该使用哪些工具。
     system_message = (
         "You are a helpful assistant with access to these tools:\n\n"
         f"{tools_description}\n"
         "Choose the appropriate tool based on the user's question. "
         "If no tool is needed, reply directly.\n\n"
         "IMPORTANT: When you need to use a tool, you must ONLY respond with "
         "the exact JSON object format below, nothing else:\n"
         "{\n"
         '    "tool": "tool-name",\n'
         '    "arguments": {\n'
         '        "argument-name": "value"\n'
         "    }\n"
         "}\n\n"
         "After receiving a tool's response:\n"
         "1. Transform the raw data into a natural, conversational response\n"
         "2. Keep responses concise but informative\n"
         "3. Focus on the most relevant information\n"
         "4. Use appropriate context from the user's question\n"
         "5. Avoid simply repeating the raw data\n\n"
         "Please use only the tools that are explicitly defined above."
     )
     messages = [{"role": "system", "content": system_message}]
 ​
     while True:
         # Final... 假设这里已经处理了用户消息输入.
         messages.append({"role": "user", "content": user_input})
 ​
         # 将 system_message 和用户消息输入一起发送给 LLM
         llm_response = self.llm_client.get_response(messages)
 ​
     ... # 后面和确定使用哪些工具无关

 ​
 class Tool:
     """Represents a tool with its properties and formatting."""
 ​
     def __init__(
         self, name: str, description: str, input_schema: dict[str, Any]
     ) -> None:
         self.name: str = name
         self.description: str = description
         self.input_schema: dict[str, Any] = input_schema
 ​
     # 把工具的名字 / 工具的用途（description）和工具所需要的参数（args_desc）转化为文本
     def format_for_llm(self) -> str:
         """Format tool information for LLM.
 ​
         Returns:
             A formatted string describing the tool.
         """
         args_desc = []
         if "properties" in self.input_schema:
             for param_name, param_info in self.input_schema["properties"].items():
                 arg_desc = (
                     f"- {param_name}: {param_info.get('description', 'No description')}"
                 )
                 if param_name in self.input_schema.get("required", []):
                     arg_desc += " (required)"
                 args_desc.append(arg_desc)
 ​
         return f"""
 Tool: {self.name}
 Description: {self.description}
 Arguments:
 {chr(10).join(args_desc)}
 """
```

那 tool 的描述和代码中的 `input_schema` 是从哪里来的呢？通过进一步分析 MCP 的 Python SDK 源代码可以发现：大部分情况下，当使用装饰器 `@mcp.tool()` 来装饰函数时，对应的 `name` 和 `description` 等其实直接源自用户定义函数的函数名以及函数的 `docstring` 等。

```python
 @classmethod
 def from_function(
     cls,
     fn: Callable,
     name: str | None = None,
     description: str | None = None,
     context_kwarg: str | None = None,
 ) -> "Tool":
     """Create a Tool from a function."""
     func_name = name or fn.__name__ # 获取函数名
 ​
     if func_name == "<lambda>":
         raise ValueError("You must provide a name for lambda functions")
 ​
     func_doc = description or fn.__doc__ or "" # 获取函数 docstring
     is_async = inspect.iscoroutinefunction(fn)
```

**模型是通过 prompt engineering，即提供所有工具的结构化描述和 few-shot 的 example 来确定该使用哪些工具**。另一方面，Anthropic 对 Claude 做了专门的训练。

### 5.1 反馈机制

我们把 system prompt（指令与工具调用描述）和用户消息一起发送给模型，然后接收模型的回复。当模型分析用户请求后，它会决定是否需要调用工具：

- **无需工具时**：模型直接生成自然语言回复。
- **需要工具时**：模型输出结构化 JSON 格式的工具调用请求。

如果回复中包含结构化 JSON 格式的工具调用请求，则客户端会根据这个 json 代码执行对应的工具。具体的实现逻辑都在 `process_llm_response` 中，代码逻辑非常简单。

如果模型执行了 tool call，则工具执行的结果 `result` 会和 system prompt 和用户消息一起**重新发送**给模型，请求模型生成最终回复。

如果 tool call 的 json 代码存在问题或者模型产生了幻觉怎么办呢？通过阅读代码发现，我们会 skip 掉无效的调用请求。

```python
 ... # 省略无关的代码
 async def start(self):
     ... # 上面已经介绍过了，模型如何选择工具
 ​
     while True:
         # 假设这里已经处理了用户消息输入.
         messages.append({"role": "user", "content": user_input})
 ​
         # 获取 LLM 的输出
         llm_response = self.llm_client.get_response(messages)
 ​
         # 处理 LLM 的输出（如果有 tool call 则执行对应的工具）
         result = await self.process_llm_response(llm_response)
 ​
         # 如果 result 与 llm_response 不同，说明执行了 tool call （有额外信息了）
         # 则将 tool call 的结果重新发送给 LLM 进行处理。
         if result != llm_response:
             messages.append({"role": "assistant", "content": llm_response})
             messages.append({"role": "system", "content": result})
 ​
             final_response = self.llm_client.get_response(messages)
             logging.info("\nFinal response: %s", final_response)
             messages.append(
                 {"role": "assistant", "content": final_response}
             )
         # 否则代表没有执行 tool call，则直接将 LLM 的输出返回给用户。
         else:
             messages.append({"role": "assistant", "content": llm_response}) 
```

结合这部分原理分析：

- 工具文档至关重要 - 模型通过工具描述文本来理解和选择工具，因此精心编写工具的名称、docstring 和参数说明至关重要。
- 由于 MCP 的选择是基于 prompt 的，所以任何模型其实都适配 MCP，只要你能提供对应的工具描述。但是当你使用非 Claude 模型时，MCP 使用的效果和体验难以保证（没有做专门的训练）。
