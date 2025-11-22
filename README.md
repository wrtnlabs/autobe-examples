# AutoBe Generated Examples

## Benchmark

AI Model | Success | Score | FCSR | Status 
:--------|---------|------:|-----:|:------:
[`anthropic/claude-sonnet-4.5`](#anthropicclaude-sonnet-45) | 4 | 100 | 92% | 🟢
[`openai/gpt-4.1`](#openaigpt-41) | 4 | 100 | 89% | 🟢
[`openai/gpt-4.1-mini`](#openaigpt-41-mini) | 4 | 100 | 85% | 🟢
[`deepseek/deepseek-v3.1-terminus-exacto`](#deepseekdeepseek-v31-terminus-exacto) | 3 | 95 | 87% | 🟢
[`qwen/qwen3-next-80b-a3b-instruct`](#qwenqwen3-next-80b-a3b-instruct) | 1 | 92.5 | 72% | 🟡
[`moonshotai/kimi-k2-0905-exacto`](#moonshotaikimi-k2-0905-exacto) | 2 | 90 | 76% | 🟡
[`openai/gpt-5.1`](#openaigpt-51) | 2 | 90 | 85% | 🟡
[`minimax/minimax-m2`](#minimaxminimax-m2) | 2 | 77.5 | 60% | 🟡
[`anthropic/claude-haiku-4.5`](#anthropicclaude-haiku-45) | 1 | 72.5 | 40% | 🟡
[`qwen/qwen3-coder-exacto`](#qwenqwen3-coder-exacto) | 1 | 57.5 | 51% | 🟡
[`mistralai/codestral-2508`](#mistralaicodestral-2508) | 1 | 47.5 | 95% | 🟡
[`x-ai/grok-code-fast-1`](#x-aigrok-code-fast-1) | 1 | 47.5 | 96% | 🟡
[`meta-llama/llama-4-maverick`](#meta-llamallama-4-maverick) | 0 | 45 | 77% | 🟡
[`meta-llama/llama-4-scout`](#meta-llamallama-4-scout) | 1 | 40 | 95% | 🟡
[`google/gemini-2.5-pro`](#googlegemini-25-pro) | 1 | 27.5 | 53% | 🟡
[`z-ai/glm-4.6-exacto`](#z-aiglm-46-exacto) | 1 | 25 | 93% | 🟡
[`deepseek/deepseek-v3.2-exp`](#deepseekdeepseek-v32-exp) | 0 | 2.5 | 100% | ❌
[`google/gemini-3-pro-preview`](#googlegemini-3-pro-preview) | 0 | 2.5 | 21% | ❌
[`openai/gpt-oss-120b-exacto`](#openaigpt-oss-120b-exacto) | 0 | 2.5 | 89% | ❌

- FCSR: Function Calling Success Rate
- Status:
  - 🟢: All projects completed successfully
  - 🟡: Some projects failed
  - ❌: All projects failed or not executed

## `anthropic/claude-sonnet-4.5`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./anthropic/claude-sonnet-4.5/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./anthropic/claude-sonnet-4.5/bbs/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./anthropic/claude-sonnet-4.5/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./anthropic/claude-sonnet-4.5/shopping/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢

### `anthropic/claude-sonnet-4.5` - `todo`

- Source Code: [`anthropic/claude-sonnet-4.5/todo`](./anthropic/claude-sonnet-4.5/todo/)
- Score: 100
- Elapsed Time: 55m 39s
- Token Usage: 26.90M
- Function Calling Success Rate: 98.12%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 11 | 1.14M | 11m 48s | 96%
🟢 Prisma | `namespaces`: 2, `models`: 5 | 535.6K | 4m 41s | 100%
🟢 Interface | `operations`: 24, `schemas`: 27 | 11.08M | 14m 18s | 97%
🟢 Test | `functions`: 105 | 12.25M | 14m 40s | 100%
🟢 Realize | `functions`: 24 | 1.90M | 10m 10s | 97%


### `anthropic/claude-sonnet-4.5` - `bbs`

- Source Code: [`anthropic/claude-sonnet-4.5/bbs`](./anthropic/claude-sonnet-4.5/bbs/)
- Score: 100
- Elapsed Time: 2h 56m 29s
- Token Usage: 108.50M
- Function Calling Success Rate: 89.58%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 767.0K | 12m 12s | 100%
🟢 Prisma | `namespaces`: 4, `models`: 15 | 971.3K | 9m 33s | 100%
🟢 Interface | `operations`: 82, `schemas`: 92 | 39.52M | 30m 12s | 92%
🟢 Test | `functions`: 403 | 58.17M | 1h 24m 59s | 89%
🟢 Realize | `functions`: 82 | 9.06M | 39m 32s | 82%


### `anthropic/claude-sonnet-4.5` - `reddit`

- Source Code: [`anthropic/claude-sonnet-4.5/reddit`](./anthropic/claude-sonnet-4.5/reddit/)
- Score: 100
- Elapsed Time: 1h 49m 45s
- Token Usage: 130.55M
- Function Calling Success Rate: 94.73%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 1.60M | 15m 1s | 100%
🟢 Prisma | `namespaces`: 6, `models`: 22 | 1.25M | 9m 20s | 100%
🟢 Interface | `operations`: 98, `schemas`: 104 | 35.36M | 20m 14s | 94%
🟢 Test | `functions`: 471 | 65.37M | 38m 23s | 96%
🟢 Realize | `functions`: 98 | 26.97M | 26m 45s | 92%


### `anthropic/claude-sonnet-4.5` - `shopping`

- Source Code: [`anthropic/claude-sonnet-4.5/shopping`](./anthropic/claude-sonnet-4.5/shopping/)
- Score: 100
- Elapsed Time: 2h 36m 43s
- Token Usage: 291.20M
- Function Calling Success Rate: 91.12%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 2.26M | 19m 15s | 100%
🟢 Prisma | `namespaces`: 10, `models`: 39 | 2.74M | 9m 16s | 100%
🟢 Interface | `operations`: 229, `schemas`: 214 | 72.04M | 27m 8s | 93%
🟢 Test | `functions`: 632 | 135.23M | 1h 4m 29s | 93%
🟢 Realize | `functions`: 229 | 78.93M | 36m 34s | 85%


## `openai/gpt-4.1`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./openai/gpt-4.1/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./openai/gpt-4.1/bbs/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./openai/gpt-4.1/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./openai/gpt-4.1/shopping/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢

### `openai/gpt-4.1` - `todo`

- Source Code: [`openai/gpt-4.1/todo`](./openai/gpt-4.1/todo/)
- Score: 100
- Elapsed Time: 47m 41s
- Token Usage: 8.76M
- Function Calling Success Rate: 93.50%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 453.1K | 3m 31s | 96%
🟢 Prisma | `namespaces`: 3, `models`: 4 | 266.5K | 3m 14s | 87%
🟢 Interface | `operations`: 15, `schemas`: 21 | 4.79M | 20m 4s | 87%
🟢 Test | `functions`: 20 | 2.15M | 5m 36s | 100%
🟢 Realize | `functions`: 15 | 1.10M | 15m 15s | 100%


### `openai/gpt-4.1` - `bbs`

- Source Code: [`openai/gpt-4.1/bbs`](./openai/gpt-4.1/bbs/)
- Score: 100
- Elapsed Time: 1h 11m 46s
- Token Usage: 31.83M
- Function Calling Success Rate: 92.48%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 11 | 537.0K | 9m 49s | 85%
🟢 Prisma | `namespaces`: 6, `models`: 12 | 477.0K | 3m 11s | 92%
🟢 Interface | `operations`: 59, `schemas`: 63 | 17.12M | 23m 52s | 88%
🟢 Test | `functions`: 93 | 9.83M | 12m 39s | 96%
🟢 Realize | `functions`: 59 | 3.86M | 22m 14s | 97%


### `openai/gpt-4.1` - `reddit`

- Source Code: [`openai/gpt-4.1/reddit`](./openai/gpt-4.1/reddit/)
- Score: 100
- Elapsed Time: 3h 22m 18s
- Token Usage: 140.96M
- Function Calling Success Rate: 88.54%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 664.6K | 5m 53s | 100%
🟢 Prisma | `namespaces`: 10, `models`: 56 | 1.28M | 12m 2s | 74%
🟢 Interface | `operations`: 245, `schemas`: 285 | 87.77M | 47m 58s | 81%
🟢 Test | `functions`: 257 | 30.59M | 19m 2s | 98%
🟢 Realize | `functions`: 245 | 20.66M | 1h 57m 21s | 98%


### `openai/gpt-4.1` - `shopping`

- Source Code: [`openai/gpt-4.1/shopping`](./openai/gpt-4.1/shopping/)
- Score: 100
- Elapsed Time: 3h 58m 20s
- Token Usage: 151.74M
- Function Calling Success Rate: 89.71%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 807.0K | 6m 12s | 89%
🟢 Prisma | `namespaces`: 10, `models`: 46 | 1.13M | 8m 7s | 82%
🟢 Interface | `operations`: 278, `schemas`: 255 | 83.01M | 58m 16s | 80%
🟢 Test | `functions`: 286 | 35.19M | 38m 11s | 99%
🟢 Realize | `functions`: 278 | 31.60M | 2h 7m 31s | 98%


## `openai/gpt-4.1-mini`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./openai/gpt-4.1-mini/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./openai/gpt-4.1-mini/bbs/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./openai/gpt-4.1-mini/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./openai/gpt-4.1-mini/shopping/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢

### `openai/gpt-4.1-mini` - `todo`

- Source Code: [`openai/gpt-4.1-mini/todo`](./openai/gpt-4.1-mini/todo/)
- Score: 100
- Elapsed Time: 1h 41m 54s
- Token Usage: 31.71M
- Function Calling Success Rate: 84.75%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 10 | 359.8K | 2m 4s | 100%
🟢 Prisma | `namespaces`: 3, `models`: 8 | 230.8K | 1m 33s | 87%
🟢 Interface | `operations`: 49, `schemas`: 63 | 21.46M | 51m 59s | 78%
🟢 Test | `functions`: 46 | 6.62M | 34m 39s | 86%
🟢 Realize | `functions`: 49 | 3.05M | 11m 37s | 96%


### `openai/gpt-4.1-mini` - `bbs`

- Source Code: [`openai/gpt-4.1-mini/bbs`](./openai/gpt-4.1-mini/bbs/)
- Score: 100
- Elapsed Time: 1h 27m 24s
- Token Usage: 34.38M
- Function Calling Success Rate: 82.09%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 644.3K | 14m 0s | 79%
🟢 Prisma | `namespaces`: 4, `models`: 8 | 266.6K | 1m 28s | 100%
🟢 Interface | `operations`: 48, `schemas`: 64 | 20.65M | 24m 11s | 76%
🟢 Test | `functions`: 52 | 7.04M | 18m 45s | 87%
🟢 Realize | `functions`: 48 | 5.78M | 28m 57s | 88%


### `openai/gpt-4.1-mini` - `reddit`

- Source Code: [`openai/gpt-4.1-mini/reddit`](./openai/gpt-4.1-mini/reddit/)
- Score: 100
- Elapsed Time: 2h 26m 39s
- Token Usage: 68.97M
- Function Calling Success Rate: 85.70%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 12 | 568.0K | 3m 55s | 100%
🟢 Prisma | `namespaces`: 5, `models`: 17 | 497.7K | 2m 25s | 78%
🟢 Interface | `operations`: 105, `schemas`: 118 | 38.20M | 59m 4s | 76%
🟢 Test | `functions`: 94 | 13.66M | 27m 51s | 88%
🟢 Realize | `functions`: 105 | 16.04M | 53m 21s | 94%


### `openai/gpt-4.1-mini` - `shopping`

- Source Code: [`openai/gpt-4.1-mini/shopping`](./openai/gpt-4.1-mini/shopping/)
- Score: 100
- Elapsed Time: 1h 46m 6s
- Token Usage: 137.37M
- Function Calling Success Rate: 86.30%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 12 | 628.5K | 11m 10s | 100%
🟢 Prisma | `namespaces`: 10, `models`: 40 | 791.0K | 2m 20s | 91%
🟢 Interface | `operations`: 211, `schemas`: 248 | 90.15M | 41m 17s | 80%
🟢 Test | `functions`: 177 | 27.96M | 12m 24s | 88%
🟢 Realize | `functions`: 211 | 17.84M | 38m 53s | 96%


## `deepseek/deepseek-v3.1-terminus-exacto`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./deepseek/deepseek-v3.1-terminus-exacto/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./deepseek/deepseek-v3.1-terminus-exacto/bbs/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./deepseek/deepseek-v3.1-terminus-exacto/reddit/) | 80 | 🟢 | 🟢 | 🟢 | 🟢 | ❌
[`shopping`](./deepseek/deepseek-v3.1-terminus-exacto/shopping/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢

### `deepseek/deepseek-v3.1-terminus-exacto` - `todo`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/todo`](./deepseek/deepseek-v3.1-terminus-exacto/todo/)
- Score: 100
- Elapsed Time: 1h 43m 22s
- Token Usage: 28.47M
- Function Calling Success Rate: 84.32%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 668.8K | 4m 37s | 100%
🟢 Prisma | `namespaces`: 3, `models`: 7 | 296.4K | 2m 50s | 100%
🟢 Interface | `operations`: 31, `schemas`: 39 | 15.53M | 32m 32s | 80%
🟢 Test | `functions`: 76 | 9.69M | 45m 5s | 75%
🟢 Realize | `functions`: 31 | 2.28M | 18m 16s | 97%


### `deepseek/deepseek-v3.1-terminus-exacto` - `bbs`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/bbs`](./deepseek/deepseek-v3.1-terminus-exacto/bbs/)
- Score: 100
- Elapsed Time: 5h 59m 41s
- Token Usage: 92.74M
- Function Calling Success Rate: 84.73%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 698.4K | 12m 18s | 100%
🟢 Prisma | `namespaces`: 8, `models`: 24 | 759.7K | 15m 25s | 100%
🟢 Interface | `operations`: 121, `schemas`: 160 | 57.20M | 1h 29m 54s | 78%
🟢 Test | `functions`: 141 | 23.15M | 2h 52m 10s | 81%
🟢 Realize | `functions`: 119 | 10.93M | 1h 9m 53s | 100%


### `deepseek/deepseek-v3.1-terminus-exacto` - `reddit`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/reddit`](./deepseek/deepseek-v3.1-terminus-exacto/reddit/)
- Score: 80
- Elapsed Time: 4h 10m 8s
- Token Usage: 188.04M
- Function Calling Success Rate: 85.81%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 7 | 494.4K | 7m 56s | 100%
🟢 Prisma | `namespaces`: 10, `models`: 84 | 1.07M | 19m 58s | 92%
🟢 Interface | `operations`: 265, `schemas`: 213 | 119.19M | 1h 29m 54s | 78%
🟢 Test | `functions`: 510 | 67.28M | 2h 12m 18s | 99%
⚪ Realize |  |  |  | 


### `deepseek/deepseek-v3.1-terminus-exacto` - `shopping`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/shopping`](./deepseek/deepseek-v3.1-terminus-exacto/shopping/)
- Score: 100
- Elapsed Time: 5h 3m 26s
- Token Usage: 161.81M
- Function Calling Success Rate: 92.03%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 10 | 467.6K | 6m 33s | 100%
🟢 Prisma | `namespaces`: 10, `models`: 59 | 1.23M | 19m 45s | 84%
🟢 Interface | `operations`: 160, `schemas`: 243 | 93.46M | 1h 32m 14s | 86%
🟢 Test | `functions`: 356 | 48.59M | 1h 40m 8s | 99%
🟢 Realize | `functions`: 158 | 18.06M | 1h 24m 45s | 98%


## `qwen/qwen3-next-80b-a3b-instruct`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3-next-80b-a3b-instruct/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./qwen/qwen3-next-80b-a3b-instruct/bbs/) | 90 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`reddit`](./qwen/qwen3-next-80b-a3b-instruct/reddit/) | 90 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`shopping`](./qwen/qwen3-next-80b-a3b-instruct/shopping/) | 90 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡

### `qwen/qwen3-next-80b-a3b-instruct` - `todo`

- Source Code: [`qwen/qwen3-next-80b-a3b-instruct/todo`](./qwen/qwen3-next-80b-a3b-instruct/todo/)
- Score: 100
- Elapsed Time: 1h 40m 15s
- Token Usage: 22.47M
- Function Calling Success Rate: 71.63%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 10 | 620.9K | 2m 58s | 89%
🟢 Prisma | `namespaces`: 2, `models`: 3 | 311.8K | 58s | 100%
🟢 Interface | `operations`: 13, `schemas`: 17 | 8.87M | 1h 12m 4s | 54%
🟢 Test | `functions`: 58 | 10.27M | 12m 3s | 76%
🟢 Realize | `functions`: 13 | 2.40M | 12m 9s | 84%


### `qwen/qwen3-next-80b-a3b-instruct` - `bbs`

- Source Code: [`qwen/qwen3-next-80b-a3b-instruct/bbs`](./qwen/qwen3-next-80b-a3b-instruct/bbs/)
- Score: 90
- Elapsed Time: 2h 19m 33s
- Token Usage: 70.10M
- Function Calling Success Rate: 71.87%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 262.4K | 1m 56s | 100%
🟢 Prisma | `namespaces`: 6, `models`: 20 | 623.1K | 7m 33s | 100%
🟢 Interface | `operations`: 44, `schemas`: 45 | 29.60M | 41m 37s | 58%
🟢 Test | `functions`: 80 | 26.11M | 42m 3s | 61%
🔴 Realize | `functions`: 44, `errors`: 1 | 13.50M | 46m 22s | 91%


### `qwen/qwen3-next-80b-a3b-instruct` - `reddit`

- Source Code: [`qwen/qwen3-next-80b-a3b-instruct/reddit`](./qwen/qwen3-next-80b-a3b-instruct/reddit/)
- Score: 90
- Elapsed Time: 3h 23m 37s
- Token Usage: 96.51M
- Function Calling Success Rate: 77.68%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 539.9K | 5m 12s | 96%
🟢 Prisma | `namespaces`: 10, `models`: 39 | 1.42M | 7m 57s | 77%
🟢 Interface | `operations`: 68, `schemas`: 75 | 40.18M | 1h 10m 27s | 68%
🟢 Test | `functions`: 68 | 28.38M | 20m 28s | 77%
🔴 Realize | `functions`: 68, `errors`: 1 | 25.98M | 1h 39m 31s | 84%


### `qwen/qwen3-next-80b-a3b-instruct` - `shopping`

- Source Code: [`qwen/qwen3-next-80b-a3b-instruct/shopping`](./qwen/qwen3-next-80b-a3b-instruct/shopping/)
- Score: 90
- Elapsed Time: 5h 58m 36s
- Token Usage: 375.19M
- Function Calling Success Rate: 71.90%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 801.8K | 8m 16s | 100%
🟢 Prisma | `namespaces`: 10, `models`: 47 | 1.67M | 7m 56s | 84%
🟢 Interface | `operations`: 172, `schemas`: 171 | 112.28M | 1h 36m 18s | 61%
🟢 Test | `functions`: 360 | 184.90M | 2h 7m 26s | 69%
🔴 Realize | `functions`: 172, `errors`: 4 | 75.54M | 1h 58m 38s | 81%


## `moonshotai/kimi-k2-0905-exacto`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./moonshotai/kimi-k2-0905-exacto/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./moonshotai/kimi-k2-0905-exacto/bbs/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./moonshotai/kimi-k2-0905-exacto/reddit/) | 80 | 🟢 | 🟢 | 🟢 | 🟢 | ❌
[`shopping`](./moonshotai/kimi-k2-0905-exacto/shopping/) | 80 | 🟢 | 🟢 | 🟢 | 🟢 | ❌

### `moonshotai/kimi-k2-0905-exacto` - `todo`

- Source Code: [`moonshotai/kimi-k2-0905-exacto/todo`](./moonshotai/kimi-k2-0905-exacto/todo/)
- Score: 100
- Elapsed Time: 1h 59m 51s
- Token Usage: 38.48M
- Function Calling Success Rate: 73.77%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 8 | 383.2K | 3m 55s | 100%
🟢 Prisma | `namespaces`: 3, `models`: 3 | 324.6K | 2m 7s | 100%
🟢 Interface | `operations`: 24, `schemas`: 38 | 22.38M | 1h 27m 37s | 55%
🟢 Test | `functions`: 94 | 14.12M | 21m 5s | 94%
🟢 Realize | `functions`: 24 | 1.27M | 5m 4s | 98%


### `moonshotai/kimi-k2-0905-exacto` - `bbs`

- Source Code: [`moonshotai/kimi-k2-0905-exacto/bbs`](./moonshotai/kimi-k2-0905-exacto/bbs/)
- Score: 100
- Elapsed Time: 4h 1m 32s
- Token Usage: 117.34M
- Function Calling Success Rate: 84.23%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 5 | 223.4K | 10m 2s | 100%
🟢 Prisma | `namespaces`: 6, `models`: 16 | 614.8K | 10m 25s | 94%
🟢 Interface | `operations`: 94, `schemas`: 118 | 51.79M | 1h 6m 42s | 79%
🟢 Test | `functions`: 253 | 43.61M | 41m 58s | 89%
🟢 Realize | `functions`: 94 | 21.10M | 1h 52m 22s | 84%


### `moonshotai/kimi-k2-0905-exacto` - `reddit`

- Source Code: [`moonshotai/kimi-k2-0905-exacto/reddit`](./moonshotai/kimi-k2-0905-exacto/reddit/)
- Score: 80
- Elapsed Time: 2h 29m 4s
- Token Usage: 95.68M
- Function Calling Success Rate: 83.80%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 15 | 1.08M | 12m 53s | 100%
🟢 Prisma | `namespaces`: 8, `models`: 41 | 1.08M | 23m 42s | 91%
🟢 Interface | `operations`: 85, `schemas`: 92 | 51.73M | 1h 16m 54s | 77%
🟢 Test | `functions`: 240 | 41.78M | 35m 33s | 91%
⚪ Realize |  |  |  | 


### `moonshotai/kimi-k2-0905-exacto` - `shopping`

- Source Code: [`moonshotai/kimi-k2-0905-exacto/shopping`](./moonshotai/kimi-k2-0905-exacto/shopping/)
- Score: 80
- Elapsed Time: 8h 0m 52s
- Token Usage: 413.49M
- Function Calling Success Rate: 72.38%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 12 | 566.6K | 7m 45s | 100%
🟢 Prisma | `namespaces`: 12, `models`: 57 | 3.08M | 24m 48s | 62%
🟢 Interface | `operations`: 178, `schemas`: 271 | 192.71M | 3h 35m 18s | 52%
🟢 Test | `functions`: 381 | 217.14M | 3h 52m 58s | 92%
⚪ Realize |  |  |  | 


## `openai/gpt-5.1`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./openai/gpt-5.1/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./openai/gpt-5.1/bbs/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./openai/gpt-5.1/reddit/) | 80 | 🟢 | 🟢 | 🟢 | 🟢 | ❌
[`shopping`](./openai/gpt-5.1/shopping/) | 80 | 🟢 | 🟢 | 🟢 | 🟢 | ❌

### `openai/gpt-5.1` - `todo`

- Source Code: [`openai/gpt-5.1/todo`](./openai/gpt-5.1/todo/)
- Score: 100
- Elapsed Time: 1h 30m 54s
- Token Usage: 36.98M
- Function Calling Success Rate: 89.18%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 603.3K | 19m 31s | 100%
🟢 Prisma | `namespaces`: 3, `models`: 7 | 324.9K | 3m 6s | 100%
🟢 Interface | `operations`: 41, `schemas`: 54 | 16.35M | 16m 10s | 76%
🟢 Test | `functions`: 159 | 17.27M | 35m 51s | 97%
🟢 Realize | `functions`: 41 | 2.42M | 16m 14s | 100%


### `openai/gpt-5.1` - `bbs`

- Source Code: [`openai/gpt-5.1/bbs`](./openai/gpt-5.1/bbs/)
- Score: 100
- Elapsed Time: 1h 29m 24s
- Token Usage: 64.62M
- Function Calling Success Rate: 89.39%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 944.6K | 8m 19s | 100%
🟢 Prisma | `namespaces`: 7, `models`: 23 | 754.0K | 4m 26s | 100%
🟢 Interface | `operations`: 77, `schemas`: 93 | 26.81M | 23m 23s | 78%
🟢 Test | `functions`: 249 | 28.81M | 33m 33s | 98%
🟢 Realize | `functions`: 77 | 7.31M | 19m 40s | 97%


### `openai/gpt-5.1` - `reddit`

- Source Code: [`openai/gpt-5.1/reddit`](./openai/gpt-5.1/reddit/)
- Score: 80
- Elapsed Time: 1h 55m 1s
- Token Usage: 205.01M
- Function Calling Success Rate: 82.22%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 1.21M | 8m 15s | 100%
🟢 Prisma | `namespaces`: 9, `models`: 43 | 1.35M | 6m 57s | 86%
🟢 Interface | `operations`: 237, `schemas`: 299 | 105.48M | 44m 29s | 70%
🟢 Test | `functions`: 779 | 96.97M | 55m 19s | 99%
⚪ Realize |  |  |  | 


### `openai/gpt-5.1` - `shopping`

- Source Code: [`openai/gpt-5.1/shopping`](./openai/gpt-5.1/shopping/)
- Score: 80
- Elapsed Time: 7h 58m 41s
- Token Usage: 747.39M
- Function Calling Success Rate: 85.81%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 12 | 1.31M | 8m 49s | 100%
🟢 Prisma | `namespaces`: 11, `models`: 125 | 2.28M | 10m 31s | 80%
🟢 Interface | `operations`: 659, `schemas`: 889 | 360.35M | 1h 26m 12s | 79%
🟢 Test | `functions`: 2051 | 383.46M | 6h 13m 7s | 93%
⚪ Realize |  |  |  | 


## `minimax/minimax-m2`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./minimax/minimax-m2/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./minimax/minimax-m2/bbs/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./minimax/minimax-m2/reddit/) | 80 | 🟢 | 🟢 | 🟢 | 🟢 | ❌
[`shopping`](./minimax/minimax-m2/shopping/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌

### `minimax/minimax-m2` - `todo`

- Source Code: [`minimax/minimax-m2/todo`](./minimax/minimax-m2/todo/)
- Score: 100
- Elapsed Time: 1h 37m 38s
- Token Usage: 59.74M
- Function Calling Success Rate: 69.89%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 11 | 2.08M | 6m 38s | 92%
🟢 Prisma | `namespaces`: 3, `models`: 7 | 469.8K | 2m 56s | 87%
🟢 Interface | `operations`: 45, `schemas`: 39 | 26.46M | 33m 27s | 65%
🟢 Test | `functions`: 103 | 22.11M | 19m 23s | 66%
🟢 Realize | `functions`: 45 | 6.41M | 18m 3s | 62%


### `minimax/minimax-m2` - `bbs`

- Source Code: [`minimax/minimax-m2/bbs`](./minimax/minimax-m2/bbs/)
- Score: 100
- Elapsed Time: 1h 10m 59s
- Token Usage: 62.91M
- Function Calling Success Rate: 70.91%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 11 | 591.8K | 6m 1s | 96%
🟢 Prisma | `namespaces`: 2, `models`: 3 | 344.5K | 2m 20s | 100%
🟢 Interface | `operations`: 39, `schemas`: 39 | 21.22M | 25m 37s | 68%
🟢 Test | `functions`: 94 | 32.75M | 19m 34s | 68%
🟢 Realize | `functions`: 39 | 8.01M | 17m 25s | 73%


### `minimax/minimax-m2` - `reddit`

- Source Code: [`minimax/minimax-m2/reddit`](./minimax/minimax-m2/reddit/)
- Score: 80
- Elapsed Time: 2h 40m 13s
- Token Usage: 229.33M
- Function Calling Success Rate: 52.93%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 11 | 1.21M | 8m 11s | 95%
🟢 Prisma | `namespaces`: 7, `models`: 32 | 1.53M | 5m 41s | 84%
🟢 Interface | `operations`: 170, `schemas`: 165 | 99.18M | 57m 0s | 64%
🟢 Test | `functions`: 317 | 126.80M | 1h 20m 56s | 40%
⚪ Realize |  |  |  | 


### `minimax/minimax-m2` - `shopping`

- Source Code: [`minimax/minimax-m2/shopping`](./minimax/minimax-m2/shopping/)
- Score: 30
- Elapsed Time: 44m 59s
- Token Usage: 7.51M
- Function Calling Success Rate: 85.37%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 2.02M | 10m 34s | 95%
🟢 Prisma | `namespaces`: 10, `models`: 58 | 4.16M | 14m 37s | 53%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `anthropic/claude-haiku-4.5`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./anthropic/claude-haiku-4.5/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./anthropic/claude-haiku-4.5/bbs/) | 80 | 🟢 | 🟢 | 🟢 | 🟢 | ❌
[`reddit`](./anthropic/claude-haiku-4.5/reddit/) | 80 | 🟢 | 🟢 | 🟢 | 🟢 | ❌
[`shopping`](./anthropic/claude-haiku-4.5/shopping/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌

### `anthropic/claude-haiku-4.5` - `todo`

- Source Code: [`anthropic/claude-haiku-4.5/todo`](./anthropic/claude-haiku-4.5/todo/)
- Score: 100
- Elapsed Time: 1h 22m 33s
- Token Usage: 142.95M
- Function Calling Success Rate: 36.43%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 11 | 1.24M | 6m 35s | 100%
🟢 Prisma | `namespaces`: 3, `models`: 6 | 1.08M | 4m 45s | 100%
🟢 Interface | `operations`: 25, `schemas`: 34 | 16.80M | 14m 23s | 74%
🟢 Test | `functions`: 234 | 119.19M | 41m 6s | 25%
🟢 Realize | `functions`: 25 | 4.63M | 15m 43s | 48%


### `anthropic/claude-haiku-4.5` - `bbs`

- Source Code: [`anthropic/claude-haiku-4.5/bbs`](./anthropic/claude-haiku-4.5/bbs/)
- Score: 80
- Elapsed Time: 1h 45m 34s
- Token Usage: 293.56M
- Function Calling Success Rate: 35.54%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 8 | 573.8K | 4m 57s | 100%
🟢 Prisma | `namespaces`: 6, `models`: 21 | 1.42M | 5m 21s | 85%
🟢 Interface | `operations`: 58, `schemas`: 68 | 33.46M | 22m 16s | 73%
🟢 Test | `functions`: 520 | 258.10M | 1h 12m 58s | 27%
⚪ Realize |  |  |  | 


### `anthropic/claude-haiku-4.5` - `reddit`

- Source Code: [`anthropic/claude-haiku-4.5/reddit`](./anthropic/claude-haiku-4.5/reddit/)
- Score: 80
- Elapsed Time: 2h 40m 57s
- Token Usage: 723.74M
- Function Calling Success Rate: 42.55%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 12 | 1.57M | 7m 53s | 100%
🟢 Prisma | `namespaces`: 8, `models`: 36 | 2.37M | 5m 34s | 95%
🟢 Interface | `operations`: 199, `schemas`: 202 | 105.00M | 32m 3s | 72%
🟢 Test | `functions`: 1402 | 614.81M | 1h 55m 26s | 35%
⚪ Realize |  |  |  | 


### `anthropic/claude-haiku-4.5` - `shopping`

- Source Code: [`anthropic/claude-haiku-4.5/shopping`](./anthropic/claude-haiku-4.5/shopping/)
- Score: 30
- Elapsed Time: 36m 29s
- Token Usage: 6.52M
- Function Calling Success Rate: 84.38%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 12 | 1.88M | 10m 5s | 100%
🟢 Prisma | `namespaces`: 11, `models`: 66 | 4.64M | 26m 24s | 74%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `qwen/qwen3-coder-exacto`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3-coder-exacto/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./qwen/qwen3-coder-exacto/bbs/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌
[`reddit`](./qwen/qwen3-coder-exacto/reddit/) | 90 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`shopping`](./qwen/qwen3-coder-exacto/shopping/) | 10 | 🟢 | ❌ | ❌ | ❌ | ❌

### `qwen/qwen3-coder-exacto` - `todo`

- Source Code: [`qwen/qwen3-coder-exacto/todo`](./qwen/qwen3-coder-exacto/todo/)
- Score: 100
- Elapsed Time: 56m 20s
- Token Usage: 34.13M
- Function Calling Success Rate: 36.42%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 1.89M | 9m 50s | 82%
🟢 Prisma | `namespaces`: 2, `models`: 3 | 756.7K | 3m 13s | 50%
🟢 Interface | `operations`: 13, `schemas`: 11 | 11.01M | 15m 35s | 56%
🟢 Test | `functions`: 4 | 14.08M | 9m 20s | 18%
🟢 Realize | `functions`: 13 | 6.40M | 18m 19s | 18%


### `qwen/qwen3-coder-exacto` - `bbs`

- Source Code: [`qwen/qwen3-coder-exacto/bbs`](./qwen/qwen3-coder-exacto/bbs/)
- Score: 30
- Elapsed Time: 17m 12s
- Token Usage: 2.36M
- Function Calling Success Rate: 53.97%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 10 | 1.48M | 12m 31s | 51%
🟢 Prisma | `namespaces`: 5, `models`: 11 | 876.2K | 4m 41s | 59%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `qwen/qwen3-coder-exacto` - `reddit`

- Source Code: [`qwen/qwen3-coder-exacto/reddit`](./qwen/qwen3-coder-exacto/reddit/)
- Score: 90
- Elapsed Time: 3h 0m 49s
- Token Usage: 110.78M
- Function Calling Success Rate: 55.68%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 1.53M | 12m 18s | 62%
🟢 Prisma | `namespaces`: 7, `models`: 21 | 1.63M | 5m 42s | 54%
🟢 Interface | `operations`: 72, `schemas`: 71 | 55.74M | 1h 2m 18s | 54%
🟢 Test | `functions`: 118 | 29.21M | 36m 30s | 61%
🔴 Realize | `functions`: 72, `errors`: 1 | 22.68M | 1h 3m 59s | 53%


### `qwen/qwen3-coder-exacto` - `shopping`

- Source Code: [`qwen/qwen3-coder-exacto/shopping`](./qwen/qwen3-coder-exacto/shopping/)
- Score: 10
- Elapsed Time: 10m 20s
- Token Usage: 3.21M
- Function Calling Success Rate: 90.32%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 3.21M | 10m 20s | 90%
⚪ Prisma |  |  |  | 
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `mistralai/codestral-2508`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./mistralai/codestral-2508/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./mistralai/codestral-2508/bbs/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌
[`reddit`](./mistralai/codestral-2508/reddit/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌
[`shopping`](./mistralai/codestral-2508/shopping/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌

### `mistralai/codestral-2508` - `todo`

- Source Code: [`mistralai/codestral-2508/todo`](./mistralai/codestral-2508/todo/)
- Score: 100
- Elapsed Time: 1h 18m 40s
- Token Usage: 11.56M
- Function Calling Success Rate: 92.74%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 425.2K | 5m 13s | 100%
🟢 Prisma | `namespaces`: 2, `models`: 3 | 156.2K | 3m 20s | 100%
🟢 Interface | `operations`: 18, `schemas`: 26 | 6.04M | 28m 11s | 88%
🟢 Test | `functions`: 29 | 3.01M | 9m 26s | 97%
🟢 Realize | `functions`: 18 | 1.94M | 32m 29s | 93%


### `mistralai/codestral-2508` - `bbs`

- Source Code: [`mistralai/codestral-2508/bbs`](./mistralai/codestral-2508/bbs/)
- Score: 30
- Elapsed Time: 3m 10s
- Token Usage: 548.8K
- Function Calling Success Rate: 104.76%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 4 | 184.8K | 1m 21s | 111%
🟢 Prisma | `namespaces`: 5, `models`: 20 | 364.0K | 1m 49s | 100%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `mistralai/codestral-2508` - `reddit`

- Source Code: [`mistralai/codestral-2508/reddit`](./mistralai/codestral-2508/reddit/)
- Score: 30
- Elapsed Time: 10m 0s
- Token Usage: 707.4K
- Function Calling Success Rate: 104.17%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 4 | 197.6K | 1m 15s | 111%
🟢 Prisma | `namespaces`: 6, `models`: 16 | 509.7K | 8m 44s | 100%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `mistralai/codestral-2508` - `shopping`

- Source Code: [`mistralai/codestral-2508/shopping`](./mistralai/codestral-2508/shopping/)
- Score: 30
- Elapsed Time: 18m 9s
- Token Usage: 1.44M
- Function Calling Success Rate: 102.33%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 10 | 470.8K | 8m 51s | 104%
🟢 Prisma | `namespaces`: 10, `models`: 33 | 965.1K | 9m 18s | 100%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `x-ai/grok-code-fast-1`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./x-ai/grok-code-fast-1/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./x-ai/grok-code-fast-1/bbs/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌
[`reddit`](./x-ai/grok-code-fast-1/reddit/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌
[`shopping`](./x-ai/grok-code-fast-1/shopping/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌

### `x-ai/grok-code-fast-1` - `todo`

- Source Code: [`x-ai/grok-code-fast-1/todo`](./x-ai/grok-code-fast-1/todo/)
- Score: 100
- Elapsed Time: 1h 40m 39s
- Token Usage: 18.72M
- Function Calling Success Rate: 95.04%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 12 | 464.9K | 5m 58s | 100%
🟢 Prisma | `namespaces`: 4, `models`: 7 | 309.4K | 4m 5s | 100%
🟢 Interface | `operations`: 34, `schemas`: 40 | 9.41M | 40m 37s | 90%
🟢 Test | `functions`: 42 | 5.08M | 13m 24s | 98%
🟢 Realize | `functions`: 34 | 3.45M | 36m 34s | 97%


### `x-ai/grok-code-fast-1` - `bbs`

- Source Code: [`x-ai/grok-code-fast-1/bbs`](./x-ai/grok-code-fast-1/bbs/)
- Score: 30
- Elapsed Time: 8m 53s
- Token Usage: 864.2K
- Function Calling Success Rate: 100.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 540.6K | 5m 1s | 100%
🟢 Prisma | `namespaces`: 3, `models`: 8 | 323.5K | 3m 51s | 100%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `x-ai/grok-code-fast-1` - `reddit`

- Source Code: [`x-ai/grok-code-fast-1/reddit`](./x-ai/grok-code-fast-1/reddit/)
- Score: 30
- Elapsed Time: 6m 54s
- Token Usage: 1.88M
- Function Calling Success Rate: 100.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 15 | 1.05M | 3m 33s | 100%
🟢 Prisma | `namespaces`: 6, `models`: 14 | 826.0K | 3m 21s | 100%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `x-ai/grok-code-fast-1` - `shopping`

- Source Code: [`x-ai/grok-code-fast-1/shopping`](./x-ai/grok-code-fast-1/shopping/)
- Score: 30
- Elapsed Time: 6m 4s
- Token Usage: 2.33M
- Function Calling Success Rate: 98.15%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 15 | 1.19M | 3m 15s | 100%
🟢 Prisma | `namespaces`: 8, `models`: 22 | 1.14M | 2m 49s | 95%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `meta-llama/llama-4-maverick`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./meta-llama/llama-4-maverick/todo/) | 90 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`bbs`](./meta-llama/llama-4-maverick/bbs/) | 90 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
`reddit` | 0 | ❌ | ❌ | ❌ | ❌ | ❌
`shopping` | 0 | ❌ | ❌ | ❌ | ❌ | ❌

### `meta-llama/llama-4-maverick` - `todo`

- Source Code: [`meta-llama/llama-4-maverick/todo`](./meta-llama/llama-4-maverick/todo/)
- Score: 90
- Elapsed Time: 52m 16s
- Token Usage: 24.13M
- Function Calling Success Rate: 71.01%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 5 | 205.6K | 11s | 100%
🟢 Prisma | `namespaces`: 2, `models`: 3 | 126.7K | 26s | 100%
🟢 Interface | `operations`: 14, `schemas`: 22 | 9.84M | 12m 41s | 42%
🟢 Test | `functions`: 13 | 3.30M | 3m 12s | 79%
🔴 Realize | `functions`: 14, `errors`: 3 | 10.67M | 35m 43s | 84%


### `meta-llama/llama-4-maverick` - `bbs`

- Source Code: [`meta-llama/llama-4-maverick/bbs`](./meta-llama/llama-4-maverick/bbs/)
- Score: 90
- Elapsed Time: 1h 21m 33s
- Token Usage: 46.56M
- Function Calling Success Rate: 81.32%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 7 | 312.9K | 14s | 94%
🟢 Prisma | `namespaces`: 5, `models`: 13 | 296.8K | 35s | 100%
🟢 Interface | `operations`: 52, `schemas`: 66 | 19.91M | 10m 36s | 76%
🟢 Test | `functions`: 37 | 7.42M | 7m 46s | 96%
🔴 Realize | `functions`: 52, `errors`: 2 | 18.62M | 1h 2m 21s | 80%


## `meta-llama/llama-4-scout`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./meta-llama/llama-4-scout/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./meta-llama/llama-4-scout/bbs/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌
[`reddit`](./meta-llama/llama-4-scout/reddit/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌
`shopping` | 0 | ❌ | ❌ | ❌ | ❌ | ❌

### `meta-llama/llama-4-scout` - `todo`

- Source Code: [`meta-llama/llama-4-scout/todo`](./meta-llama/llama-4-scout/todo/)
- Score: 100
- Elapsed Time: 1h 21m 49s
- Token Usage: 13.71M
- Function Calling Success Rate: 94.35%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 447.2K | 7m 58s | 100%
🟢 Prisma | `namespaces`: 2, `models`: 5 | 169.7K | 5m 11s | 100%
🟢 Interface | `operations`: 24, `schemas`: 35 | 8.22M | 36m 51s | 90%
🟢 Test | `functions`: 33 | 3.44M | 7m 58s | 100%
🟢 Realize | `functions`: 24 | 1.44M | 23m 49s | 96%


### `meta-llama/llama-4-scout` - `bbs`

- Source Code: [`meta-llama/llama-4-scout/bbs`](./meta-llama/llama-4-scout/bbs/)
- Score: 30
- Elapsed Time: 1m 33s
- Token Usage: 916.9K
- Function Calling Success Rate: 97.62%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 403.9K | 40s | 100%
🟢 Prisma | `namespaces`: 9, `models`: 18 | 513.0K | 52s | 94%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `meta-llama/llama-4-scout` - `reddit`

- Source Code: [`meta-llama/llama-4-scout/reddit`](./meta-llama/llama-4-scout/reddit/)
- Score: 30
- Elapsed Time: 2m 37s
- Token Usage: 1.11M
- Function Calling Success Rate: 100.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 12 | 495.6K | 1m 37s | 100%
🟢 Prisma | `namespaces`: 11, `models`: 22 | 616.6K | 59s | 100%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `google/gemini-2.5-pro`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./google/gemini-2.5-pro/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./google/gemini-2.5-pro/bbs/) | 10 | 🟢 | ❌ | ❌ | ❌ | ❌
`reddit` | 0 | ❌ | ❌ | ❌ | ❌ | ❌
`shopping` | 0 | ❌ | ❌ | ❌ | ❌ | ❌

### `google/gemini-2.5-pro` - `todo`

- Source Code: [`google/gemini-2.5-pro/todo`](./google/gemini-2.5-pro/todo/)
- Score: 100
- Elapsed Time: 54m 28s
- Token Usage: 8.71M
- Function Calling Success Rate: 94.12%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 12 | 478.1K | 4m 29s | 96%
🟢 Prisma | `namespaces`: 2, `models`: 3 | 162.7K | 4m 5s | 100%
🟢 Interface | `operations`: 15, `schemas`: 21 | 5.30M | 22m 3s | 88%
🟢 Test | `functions`: 8 | 1.90M | 5m 39s | 100%
🟢 Realize | `functions`: 15 | 874.3K | 18m 11s | 100%


### `google/gemini-2.5-pro` - `bbs`

- Source Code: [`google/gemini-2.5-pro/bbs`](./google/gemini-2.5-pro/bbs/)
- Score: 10
- Elapsed Time: 20m 55s
- Token Usage: 4.26M
- Function Calling Success Rate: 7.27%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 4.26M | 20m 55s | 7%
⚪ Prisma |  |  |  | 
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `z-ai/glm-4.6-exacto`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./z-ai/glm-4.6-exacto/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
`bbs` | 0 | ❌ | ❌ | ❌ | ❌ | ❌
`reddit` | 0 | ❌ | ❌ | ❌ | ❌ | ❌
`shopping` | 0 | ❌ | ❌ | ❌ | ❌ | ❌

### `z-ai/glm-4.6-exacto` - `todo`

- Source Code: [`z-ai/glm-4.6-exacto/todo`](./z-ai/glm-4.6-exacto/todo/)
- Score: 100
- Elapsed Time: 1h 27m 40s
- Token Usage: 16.64M
- Function Calling Success Rate: 93.37%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 12 | 449.0K | 5m 0s | 100%
🟢 Prisma | `namespaces`: 2, `models`: 5 | 165.3K | 5m 45s | 100%
🟢 Interface | `operations`: 28, `schemas`: 37 | 9.32M | 36m 47s | 87%
🟢 Test | `functions`: 45 | 4.92M | 13m 57s | 96%
🟢 Realize | `functions`: 28 | 1.79M | 26m 9s | 100%


## `deepseek/deepseek-v3.2-exp`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
`todo` | 0 | ❌ | ❌ | ❌ | ❌ | ❌
`bbs` | 0 | ❌ | ❌ | ❌ | ❌ | ❌
`reddit` | 0 | ❌ | ❌ | ❌ | ❌ | ❌
[`shopping`](./deepseek/deepseek-v3.2-exp/shopping/) | 10 | 🟢 | ❌ | ❌ | ❌ | ❌

### `deepseek/deepseek-v3.2-exp` - `shopping`

- Source Code: [`deepseek/deepseek-v3.2-exp/shopping`](./deepseek/deepseek-v3.2-exp/shopping/)
- Score: 10
- Elapsed Time: 20m 48s
- Token Usage: 1.03M
- Function Calling Success Rate: 100.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 1.03M | 20m 48s | 100%
⚪ Prisma |  |  |  | 
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `google/gemini-3-pro-preview`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
`todo` | 0 | ❌ | ❌ | ❌ | ❌ | ❌
[`bbs`](./google/gemini-3-pro-preview/bbs/) | 10 | 🟢 | ❌ | ❌ | ❌ | ❌
`reddit` | 0 | ❌ | ❌ | ❌ | ❌ | ❌
`shopping` | 0 | ❌ | ❌ | ❌ | ❌ | ❌

### `google/gemini-3-pro-preview` - `bbs`

- Source Code: [`google/gemini-3-pro-preview/bbs`](./google/gemini-3-pro-preview/bbs/)
- Score: 10
- Elapsed Time: 8m 21s
- Token Usage: 1.08M
- Function Calling Success Rate: 21.82%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 1.08M | 8m 21s | 21%
⚪ Prisma |  |  |  | 
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `openai/gpt-oss-120b-exacto`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
`todo` | 0 | ❌ | ❌ | ❌ | ❌ | ❌
[`bbs`](./openai/gpt-oss-120b-exacto/bbs/) | 10 | 🟢 | ❌ | ❌ | ❌ | ❌
`reddit` | 0 | ❌ | ❌ | ❌ | ❌ | ❌
`shopping` | 0 | ❌ | ❌ | ❌ | ❌ | ❌

### `openai/gpt-oss-120b-exacto` - `bbs`

- Source Code: [`openai/gpt-oss-120b-exacto/bbs`](./openai/gpt-oss-120b-exacto/bbs/)
- Score: 10
- Elapsed Time: 3m 29s
- Token Usage: 720.2K
- Function Calling Success Rate: 89.66%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 720.2K | 3m 29s | 89%
⚪ Prisma |  |  |  | 
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 