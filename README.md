# AutoBe Generated Examples

## Benchmark

AI Model | Success | Score | FCSR | Status 
:--------|---------|------:|-----:|:------:
[`anthropic/claude-sonnet-4.5`](#anthropicclaude-sonnet-45) | 4 | 100 | 92% | 🟢
[`openai/gpt-4.1`](#openaigpt-41) | 4 | 100 | 88% | 🟢
[`openai/gpt-4.1-mini`](#openaigpt-41-mini) | 3 | 97.5 | 82% | 🟢
[`moonshotai/kimi-k2-0905-exacto`](#moonshotaikimi-k2-0905-exacto) | 3 | 95 | 78% | 🟢
[`openai/gpt-5.1`](#openaigpt-51) | 3 | 95 | 85% | 🟢
[`qwen/qwen3-next-80b-a3b-instruct`](#qwenqwen3-next-80b-a3b-instruct) | 0 | 90 | 70% | 🟡
[`qwen/qwen3-30b-a3b-thinking-2507`](#qwenqwen3-30b-a3b-thinking-2507) | 0 | 80 | 77% | 🟡
[`minimax/minimax-m2`](#minimaxminimax-m2) | 2 | 77.5 | 61% | 🟡
[`anthropic/claude-haiku-4.5`](#anthropicclaude-haiku-45) | 1 | 72.5 | 40% | 🟡
[`meta-llama/llama-4-maverick`](#meta-llamallama-4-maverick) | 2 | 50 | 67% | 🟡
[`x-ai/grok-code-fast-1`](#x-aigrok-code-fast-1) | 1 | 47.5 | 96% | 🟡
[`qwen/qwen3-coder-exacto`](#qwenqwen3-coder-exacto) | 0 | 46.25 | 37% | 🟡
[`mistralai/codestral-2508`](#mistralaicodestral-2508) | 0 | 42.5 | 97% | 🟡
[`meta-llama/llama-4-scout`](#meta-llamallama-4-scout) | 1 | 40 | 95% | 🟡
[`deepseek/deepseek-v3.1-terminus-exacto`](#deepseekdeepseek-v31-terminus-exacto) | 0 | 38.75 | 92% | ❌
[`google/gemini-2.5-pro`](#googlegemini-25-pro) | 1 | 27.5 | 53% | 🟡
[`z-ai/glm-4.6-exacto`](#z-aiglm-46-exacto) | 1 | 25 | 93% | 🟡
[`openai/gpt-5-mini`](#openaigpt-5-mini) | 0 | 7.5 | 92% | ❌
[`moonshotai/kimi-k2.5`](#moonshotaikimi-k25) | 0 | 2.5 | 100% | ❌
[`deepseek/deepseek-v3.2-exp`](#deepseekdeepseek-v32-exp) | 0 | 2.5 | 100% | ❌
[`google/gemini-3-pro-preview`](#googlegemini-3-pro-preview) | 0 | 2.5 | 21% | ❌
[`openai/gpt-oss-120b-exacto`](#openaigpt-oss-120b-exacto) | 0 | 2.5 | 89% | ❌
[`qwen/qwen3-next-80b-a3b-thinking`](#qwenqwen3-next-80b-a3b-thinking) | 0 | 0 | 0% | ❌

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
- Elapsed Time: 58m 58s
- Token Usage: 27.60M
- Function Calling Success Rate: 98.36%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 11 | 1.14M | 11m 48s | 96%
🟢 Database | `namespaces`: 2, `models`: 5 | 535.6K | 4m 41s | 100%
🟢 Interface | `operations`: 24, `schemas`: 27 | 11.08M | 14m 18s | 97%
🟢 Test | `functions`: 105 | 12.25M | 14m 40s | 100%
🟢 Realize | `functions`: 35 | 2.60M | 13m 29s | 98%


### `anthropic/claude-sonnet-4.5` - `bbs`

- Source Code: [`anthropic/claude-sonnet-4.5/bbs`](./anthropic/claude-sonnet-4.5/bbs/)
- Score: 100
- Elapsed Time: 3h 8m 1s
- Token Usage: 108.48M
- Function Calling Success Rate: 90.48%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 767.0K | 12m 12s | 100%
🟢 Database | `namespaces`: 4, `models`: 15 | 971.3K | 9m 33s | 100%
🟢 Interface | `operations`: 82, `schemas`: 92 | 39.52M | 30m 12s | 92%
🟢 Test | `functions`: 403 | 58.17M | 1h 24m 59s | 89%
🟢 Realize | `functions`: 82 | 9.05M | 51m 3s | 86%


### `anthropic/claude-sonnet-4.5` - `reddit`

- Source Code: [`anthropic/claude-sonnet-4.5/reddit`](./anthropic/claude-sonnet-4.5/reddit/)
- Score: 100
- Elapsed Time: 2h 4m 39s
- Token Usage: 121.64M
- Function Calling Success Rate: 94.06%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 1.60M | 15m 1s | 100%
🟢 Database | `namespaces`: 6, `models`: 22 | 1.25M | 9m 20s | 100%
🟢 Interface | `operations`: 98, `schemas`: 104 | 35.36M | 20m 14s | 94%
🟢 Test | `functions`: 471 | 65.37M | 38m 23s | 96%
🟢 Realize | `functions`: 98 | 18.07M | 41m 39s | 89%


### `anthropic/claude-sonnet-4.5` - `shopping`

- Source Code: [`anthropic/claude-sonnet-4.5/shopping`](./anthropic/claude-sonnet-4.5/shopping/)
- Score: 100
- Elapsed Time: 3h 4m 8s
- Token Usage: 271.22M
- Function Calling Success Rate: 92.32%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 2.26M | 19m 15s | 100%
🟢 Database | `namespaces`: 10, `models`: 39 | 2.74M | 9m 16s | 100%
🟢 Interface | `operations`: 229, `schemas`: 214 | 72.04M | 27m 8s | 93%
🟢 Test | `functions`: 632 | 135.23M | 1h 4m 29s | 93%
🟢 Realize | `functions`: 330 | 58.95M | 1h 3m 59s | 89%


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
- Elapsed Time: 49m 36s
- Token Usage: 9.51M
- Function Calling Success Rate: 93.03%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 453.1K | 3m 31s | 96%
🟢 Database | `namespaces`: 3, `models`: 4 | 266.5K | 3m 14s | 87%
🟢 Interface | `operations`: 15, `schemas`: 21 | 4.79M | 20m 4s | 87%
🟢 Test | `functions`: 20 | 2.15M | 5m 36s | 100%
🟢 Realize | `functions`: 23 | 1.85M | 17m 10s | 97%


### `openai/gpt-4.1` - `bbs`

- Source Code: [`openai/gpt-4.1/bbs`](./openai/gpt-4.1/bbs/)
- Score: 100
- Elapsed Time: 1h 26m 29s
- Token Usage: 35.13M
- Function Calling Success Rate: 91.58%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 11 | 537.0K | 9m 49s | 85%
🟢 Database | `namespaces`: 6, `models`: 12 | 477.0K | 3m 11s | 92%
🟢 Interface | `operations`: 59, `schemas`: 63 | 17.12M | 23m 52s | 88%
🟢 Test | `functions`: 93 | 9.83M | 12m 39s | 96%
🟢 Realize | `functions`: 82 | 7.16M | 36m 57s | 93%


### `openai/gpt-4.1` - `reddit`

- Source Code: [`openai/gpt-4.1/reddit`](./openai/gpt-4.1/reddit/)
- Score: 100
- Elapsed Time: 3h 21m 12s
- Token Usage: 157.50M
- Function Calling Success Rate: 87.46%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 664.6K | 5m 53s | 100%
🟢 Database | `namespaces`: 10, `models`: 56 | 1.28M | 12m 2s | 74%
🟢 Interface | `operations`: 245, `schemas`: 285 | 87.77M | 47m 58s | 81%
🟢 Test | `functions`: 257 | 30.59M | 19m 2s | 98%
🟢 Realize | `functions`: 369 | 37.20M | 1h 56m 14s | 92%


### `openai/gpt-4.1` - `shopping`

- Source Code: [`openai/gpt-4.1/shopping`](./openai/gpt-4.1/shopping/)
- Score: 100
- Elapsed Time: 3h 39m 17s
- Token Usage: 167.20M
- Function Calling Success Rate: 87.51%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 807.0K | 6m 12s | 89%
🟢 Database | `namespaces`: 10, `models`: 46 | 1.13M | 8m 7s | 82%
🟢 Interface | `operations`: 278, `schemas`: 255 | 83.01M | 58m 16s | 80%
🟢 Test | `functions`: 286 | 35.19M | 38m 11s | 99%
🟢 Realize | `functions`: 390 | 47.06M | 1h 48m 28s | 91%


## `openai/gpt-4.1-mini`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./openai/gpt-4.1-mini/todo/) | 90 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`bbs`](./openai/gpt-4.1-mini/bbs/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./openai/gpt-4.1-mini/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./openai/gpt-4.1-mini/shopping/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢

### `openai/gpt-4.1-mini` - `todo`

- Source Code: [`openai/gpt-4.1-mini/todo`](./openai/gpt-4.1-mini/todo/)
- Score: 90
- Elapsed Time: 2h 30m 51s
- Token Usage: 96.48M
- Function Calling Success Rate: 72.86%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 11 | 457.8K | 9m 38s | 100%
🟢 Database | `namespaces`: 3, `models`: 14 | 1.81M | 4m 4s | 79%
🟢 Interface | `operations`: 35, `schemas`: 38 | 39.47M | 42m 11s | 70%
🟢 Test | `functions`: 22 | 2.92M | 5m 59s | 53%
🔴 Realize | `functions`: 50, `errors`: 2 | 7.16M | 27m 2s | 90%


### `openai/gpt-4.1-mini` - `bbs`

- Source Code: [`openai/gpt-4.1-mini/bbs`](./openai/gpt-4.1-mini/bbs/)
- Score: 100
- Elapsed Time: 1h 44m 39s
- Token Usage: 44.97M
- Function Calling Success Rate: 81.64%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 644.3K | 14m 0s | 79%
🟢 Database | `namespaces`: 4, `models`: 8 | 266.6K | 1m 28s | 100%
🟢 Interface | `operations`: 48, `schemas`: 64 | 20.65M | 24m 11s | 76%
🟢 Test | `functions`: 52 | 7.04M | 18m 45s | 87%
🟢 Realize | `functions`: 74 | 16.37M | 46m 12s | 85%


### `openai/gpt-4.1-mini` - `reddit`

- Source Code: [`openai/gpt-4.1-mini/reddit`](./openai/gpt-4.1-mini/reddit/)
- Score: 100
- Elapsed Time: 2h 41m 22s
- Token Usage: 89.27M
- Function Calling Success Rate: 84.38%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 12 | 568.0K | 3m 55s | 100%
🟢 Database | `namespaces`: 5, `models`: 17 | 497.7K | 2m 25s | 78%
🟢 Interface | `operations`: 105, `schemas`: 118 | 38.20M | 59m 4s | 76%
🟢 Test | `functions`: 94 | 13.66M | 27m 51s | 88%
🟢 Realize | `functions`: 152 | 36.34M | 1h 8m 4s | 88%


### `openai/gpt-4.1-mini` - `shopping`

- Source Code: [`openai/gpt-4.1-mini/shopping`](./openai/gpt-4.1-mini/shopping/)
- Score: 100
- Elapsed Time: 3h 11m 14s
- Token Usage: 181.24M
- Function Calling Success Rate: 84.97%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 12 | 628.5K | 11m 10s | 100%
🟢 Database | `namespaces`: 10, `models`: 40 | 791.0K | 2m 20s | 91%
🟢 Interface | `operations`: 211, `schemas`: 248 | 90.15M | 41m 17s | 80%
🟢 Test | `functions`: 177 | 27.96M | 12m 24s | 88%
🟢 Realize | `functions`: 323 | 61.71M | 2h 4m 1s | 88%


## `moonshotai/kimi-k2-0905-exacto`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./moonshotai/kimi-k2-0905-exacto/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./moonshotai/kimi-k2-0905-exacto/bbs/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./moonshotai/kimi-k2-0905-exacto/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./moonshotai/kimi-k2-0905-exacto/shopping/) | 80 | 🟢 | 🟢 | 🟢 | 🟢 | ❌

### `moonshotai/kimi-k2-0905-exacto` - `todo`

- Source Code: [`moonshotai/kimi-k2-0905-exacto/todo`](./moonshotai/kimi-k2-0905-exacto/todo/)
- Score: 100
- Elapsed Time: 3h 5m 59s
- Token Usage: 45.38M
- Function Calling Success Rate: 75.92%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 8 | 383.2K | 3m 55s | 100%
🟢 Database | `namespaces`: 3, `models`: 3 | 324.6K | 2m 7s | 100%
🟢 Interface | `operations`: 24, `schemas`: 38 | 22.38M | 1h 27m 37s | 55%
🟢 Test | `functions`: 94 | 14.12M | 21m 5s | 94%
🟢 Realize | `functions`: 33 | 8.17M | 1h 11m 12s | 91%


### `moonshotai/kimi-k2-0905-exacto` - `bbs`

- Source Code: [`moonshotai/kimi-k2-0905-exacto/bbs`](./moonshotai/kimi-k2-0905-exacto/bbs/)
- Score: 100
- Elapsed Time: 3h 34m 29s
- Token Usage: 127.78M
- Function Calling Success Rate: 86.23%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 5 | 223.4K | 10m 2s | 100%
🟢 Database | `namespaces`: 6, `models`: 16 | 614.8K | 10m 25s | 94%
🟢 Interface | `operations`: 94, `schemas`: 118 | 51.79M | 1h 6m 42s | 79%
🟢 Test | `functions`: 253 | 43.61M | 41m 58s | 89%
🟢 Realize | `functions`: 135 | 31.54M | 1h 25m 19s | 90%


### `moonshotai/kimi-k2-0905-exacto` - `reddit`

- Source Code: [`moonshotai/kimi-k2-0905-exacto/reddit`](./moonshotai/kimi-k2-0905-exacto/reddit/)
- Score: 100
- Elapsed Time: 3h 27m 28s
- Token Usage: 121.29M
- Function Calling Success Rate: 86.74%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 15 | 1.08M | 12m 53s | 100%
🟢 Database | `namespaces`: 8, `models`: 41 | 1.08M | 23m 42s | 91%
🟢 Interface | `operations`: 85, `schemas`: 92 | 51.73M | 1h 16m 54s | 77%
🟢 Test | `functions`: 240 | 41.78M | 35m 33s | 91%
🟢 Realize | `functions`: 124 | 25.61M | 58m 24s | 93%


### `moonshotai/kimi-k2-0905-exacto` - `shopping`

- Source Code: [`moonshotai/kimi-k2-0905-exacto/shopping`](./moonshotai/kimi-k2-0905-exacto/shopping/)
- Score: 80
- Elapsed Time: 8h 0m 52s
- Token Usage: 413.49M
- Function Calling Success Rate: 72.38%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 12 | 566.6K | 7m 45s | 100%
🟢 Database | `namespaces`: 12, `models`: 57 | 3.08M | 24m 48s | 62%
🟢 Interface | `operations`: 178, `schemas`: 271 | 192.71M | 3h 35m 18s | 52%
🟢 Test | `functions`: 381 | 217.14M | 3h 52m 58s | 92%
⚪ Realize |  |  |  | 


## `openai/gpt-5.1`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./openai/gpt-5.1/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./openai/gpt-5.1/bbs/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./openai/gpt-5.1/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./openai/gpt-5.1/shopping/) | 80 | 🟢 | 🟢 | 🟢 | 🟢 | ❌

### `openai/gpt-5.1` - `todo`

- Source Code: [`openai/gpt-5.1/todo`](./openai/gpt-5.1/todo/)
- Score: 100
- Elapsed Time: 1h 37m 36s
- Token Usage: 39.48M
- Function Calling Success Rate: 88.24%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 603.3K | 19m 31s | 100%
🟢 Database | `namespaces`: 3, `models`: 7 | 324.9K | 3m 6s | 100%
🟢 Interface | `operations`: 41, `schemas`: 54 | 16.35M | 16m 10s | 76%
🟢 Test | `functions`: 159 | 17.27M | 35m 51s | 97%
🟢 Realize | `functions`: 58 | 4.93M | 22m 56s | 94%


### `openai/gpt-5.1` - `bbs`

- Source Code: [`openai/gpt-5.1/bbs`](./openai/gpt-5.1/bbs/)
- Score: 100
- Elapsed Time: 1h 51m 22s
- Token Usage: 67.77M
- Function Calling Success Rate: 88.78%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 944.6K | 8m 19s | 100%
🟢 Database | `namespaces`: 7, `models`: 23 | 754.0K | 4m 26s | 100%
🟢 Interface | `operations`: 77, `schemas`: 93 | 26.81M | 23m 23s | 78%
🟢 Test | `functions`: 249 | 28.81M | 33m 33s | 98%
🟢 Realize | `functions`: 113 | 10.46M | 41m 39s | 93%


### `openai/gpt-5.1` - `reddit`

- Source Code: [`openai/gpt-5.1/reddit`](./openai/gpt-5.1/reddit/)
- Score: 100
- Elapsed Time: 3h 18m 40s
- Token Usage: 251.32M
- Function Calling Success Rate: 84.45%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 1.21M | 8m 15s | 100%
🟢 Database | `namespaces`: 9, `models`: 43 | 1.35M | 6m 57s | 86%
🟢 Interface | `operations`: 237, `schemas`: 299 | 105.48M | 44m 29s | 70%
🟢 Test | `functions`: 779 | 96.97M | 55m 19s | 99%
🟢 Realize | `functions`: 335 | 46.31M | 1h 23m 39s | 91%


### `openai/gpt-5.1` - `shopping`

- Source Code: [`openai/gpt-5.1/shopping`](./openai/gpt-5.1/shopping/)
- Score: 80
- Elapsed Time: 7h 58m 41s
- Token Usage: 747.39M
- Function Calling Success Rate: 85.81%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 12 | 1.31M | 8m 49s | 100%
🟢 Database | `namespaces`: 11, `models`: 125 | 2.28M | 10m 31s | 80%
🟢 Interface | `operations`: 659, `schemas`: 889 | 360.35M | 1h 26m 12s | 79%
🟢 Test | `functions`: 2051 | 383.46M | 6h 13m 7s | 93%
⚪ Realize |  |  |  | 


## `qwen/qwen3-next-80b-a3b-instruct`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3-next-80b-a3b-instruct/todo/) | 90 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`bbs`](./qwen/qwen3-next-80b-a3b-instruct/bbs/) | 90 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`reddit`](./qwen/qwen3-next-80b-a3b-instruct/reddit/) | 90 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`shopping`](./qwen/qwen3-next-80b-a3b-instruct/shopping/) | 90 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡

### `qwen/qwen3-next-80b-a3b-instruct` - `todo`

- Source Code: [`qwen/qwen3-next-80b-a3b-instruct/todo`](./qwen/qwen3-next-80b-a3b-instruct/todo/)
- Score: 90
- Elapsed Time: 4h 49m 17s
- Token Usage: 61.33M
- Function Calling Success Rate: 75.38%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 1.08M | 9m 20s | 73%
🟢 Database | `namespaces`: 2, `models`: 5 | 1.99M | 32m 54s | 77%
🟢 Interface | `operations`: 12, `schemas`: 22 | 19.14M | 30m 52s | 72%
🟢 Test | `functions`: 22 | 4.98M | 51m 20s | 89%
🔴 Realize | `functions`: 15, `errors`: 1 | 6.93M | 40m 20s | 65%


### `qwen/qwen3-next-80b-a3b-instruct` - `bbs`

- Source Code: [`qwen/qwen3-next-80b-a3b-instruct/bbs`](./qwen/qwen3-next-80b-a3b-instruct/bbs/)
- Score: 90
- Elapsed Time: 11h 9m 10s
- Token Usage: 325.81M
- Function Calling Success Rate: 67.12%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 1.45M | 21m 40s | 63%
🟢 Database | `namespaces`: 7, `models`: 22 | 4.97M | 11m 10s | 84%
🟢 Interface | `operations`: 52, `schemas`: 55 | 99.12M | 2h 16m 24s | 59%
🟢 Test | `functions`: 97 | 26.27M | 28m 3s | 90%
🔴 Realize | `functions`: 67, `errors`: 20 | 62.19M | 4h 34m 29s | 61%


### `qwen/qwen3-next-80b-a3b-instruct` - `reddit`

- Source Code: [`qwen/qwen3-next-80b-a3b-instruct/reddit`](./qwen/qwen3-next-80b-a3b-instruct/reddit/)
- Score: 90
- Elapsed Time: 4h 33m 52s
- Token Usage: 176.19M
- Function Calling Success Rate: 66.51%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 4 | 512.1K | 7m 4s | 55%
🟢 Database | `namespaces`: 5, `models`: 30 | 5.53M | 40m 5s | 86%
🟢 Interface | `operations`: 73, `schemas`: 73 | 129.95M | 3h 0m 21s | 56%
🟢 Test | `functions`: 127 | 40.19M | 46m 21s | 88%
🔴 Realize |  | 16.43M | 0s | 62%


### `qwen/qwen3-next-80b-a3b-instruct` - `shopping`

- Source Code: [`qwen/qwen3-next-80b-a3b-instruct/shopping`](./qwen/qwen3-next-80b-a3b-instruct/shopping/)
- Score: 90
- Elapsed Time: 5h 27m 12s
- Token Usage: 759.38M
- Function Calling Success Rate: 72.02%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 15 | 1.94M | 25m 7s | 75%
🟢 Database | `namespaces`: 10, `models`: 47 | 9.98M | 18m 42s | 79%
🟢 Interface | `operations`: 264, `schemas`: 196 | 401.73M | 2h 42m 26s | 59%
🟢 Test | `functions`: 436 | 345.73M | 2h 0m 55s | 88%
🔴 Realize |  | 542.5K | 0s | 55%


## `qwen/qwen3-30b-a3b-thinking-2507`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3-30b-a3b-thinking-2507/todo/) | 90 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`bbs`](./qwen/qwen3-30b-a3b-thinking-2507/bbs/) | 70 | 🟢 | 🟢 | 🟢 | 🟡 | ❌
[`reddit`](./qwen/qwen3-30b-a3b-thinking-2507/reddit/) | 90 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`shopping`](./qwen/qwen3-30b-a3b-thinking-2507/shopping/) | 70 | 🟢 | 🟢 | 🟢 | 🟡 | ❌

### `qwen/qwen3-30b-a3b-thinking-2507` - `todo`

- Source Code: [`qwen/qwen3-30b-a3b-thinking-2507/todo`](./qwen/qwen3-30b-a3b-thinking-2507/todo/)
- Score: 90
- Elapsed Time: 3h 38m 12s
- Token Usage: 41.34M
- Function Calling Success Rate: 74.13%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 12 | 808.9K | 8m 7s | 96%
🟢 Database | `namespaces`: 2, `models`: 6 | 1.02M | 14m 6s | 92%
🟢 Interface | `operations`: 17, `schemas`: 28 | 29.62M | 2h 30m 20s | 62%
🟢 Test | `functions`: 17 | 9.88M | 45m 38s | 91%
🔴 Realize |  | 1.05M | 0s | 75%


### `qwen/qwen3-30b-a3b-thinking-2507` - `bbs`

- Source Code: [`qwen/qwen3-30b-a3b-thinking-2507/bbs`](./qwen/qwen3-30b-a3b-thinking-2507/bbs/)
- Score: 70
- Elapsed Time: 12h 40m 22s
- Token Usage: 189.72M
- Function Calling Success Rate: 80.56%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 684.3K | 17m 32s | 100%
🟢 Database | `namespaces`: 6, `models`: 17 | 3.45M | 23m 44s | 78%
🟢 Interface | `operations`: 59, `schemas`: 68 | 67.17M | 4h 33m 11s | 77%
🔴 Test | `functions`: 67, `errors`: 1 | 47.11M | 2h 11m 25s | 87%
⚪ Realize |  |  |  | 


### `qwen/qwen3-30b-a3b-thinking-2507` - `reddit`

- Source Code: [`qwen/qwen3-30b-a3b-thinking-2507/reddit`](./qwen/qwen3-30b-a3b-thinking-2507/reddit/)
- Score: 90
- Elapsed Time: 8h 2m 54s
- Token Usage: 229.13M
- Function Calling Success Rate: 79.35%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 716.1K | 8m 58s | 95%
🟢 Database | `namespaces`: 8, `models`: 26 | 5.55M | 29m 34s | 74%
🟢 Interface | `operations`: 108, `schemas`: 109 | 127.55M | 5h 17m 44s | 71%
🟢 Test | `functions`: 72 | 95.31M | 2h 6m 37s | 89%
🔴 Realize |  | 3.29M | 0s | 91%


### `qwen/qwen3-30b-a3b-thinking-2507` - `shopping`

- Source Code: [`qwen/qwen3-30b-a3b-thinking-2507/shopping`](./qwen/qwen3-30b-a3b-thinking-2507/shopping/)
- Score: 70
- Elapsed Time: 15h 31m 33s
- Token Usage: 507.64M
- Function Calling Success Rate: 76.22%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 856.9K | 9m 15s | 92%
🟢 Database | `namespaces`: 9, `models`: 43 | 8.13M | 32m 39s | 74%
🟢 Interface | `operations`: 154, `schemas`: 169 | 194.32M | 5h 50m 48s | 73%
🔴 Test | `functions`: 135, `errors`: 1 | 101.02M | 2h 26m 8s | 85%
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
- Elapsed Time: 2h 12m 41s
- Token Usage: 61.13M
- Function Calling Success Rate: 70.67%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 11 | 2.08M | 6m 38s | 92%
🟢 Database | `namespaces`: 3, `models`: 7 | 469.8K | 2m 56s | 87%
🟢 Interface | `operations`: 45, `schemas`: 39 | 26.46M | 33m 27s | 65%
🟢 Test | `functions`: 103 | 22.11M | 19m 23s | 66%
🟢 Realize | `functions`: 45 | 7.80M | 53m 7s | 66%


### `minimax/minimax-m2` - `bbs`

- Source Code: [`minimax/minimax-m2/bbs`](./minimax/minimax-m2/bbs/)
- Score: 100
- Elapsed Time: 1h 45m 38s
- Token Usage: 62.16M
- Function Calling Success Rate: 70.83%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 11 | 591.8K | 6m 1s | 96%
🟢 Database | `namespaces`: 2, `models`: 3 | 344.5K | 2m 20s | 100%
🟢 Interface | `operations`: 39, `schemas`: 39 | 21.22M | 25m 37s | 68%
🟢 Test | `functions`: 94 | 32.75M | 19m 34s | 68%
🟢 Realize | `functions`: 39 | 7.26M | 52m 5s | 73%


### `minimax/minimax-m2` - `reddit`

- Source Code: [`minimax/minimax-m2/reddit`](./minimax/minimax-m2/reddit/)
- Score: 80
- Elapsed Time: 2h 40m 13s
- Token Usage: 229.33M
- Function Calling Success Rate: 52.93%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 11 | 1.21M | 8m 11s | 95%
🟢 Database | `namespaces`: 7, `models`: 32 | 1.53M | 5m 41s | 84%
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
🟢 Database | `namespaces`: 10, `models`: 58 | 4.16M | 14m 37s | 53%
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
- Elapsed Time: 1h 27m 3s
- Token Usage: 145.29M
- Function Calling Success Rate: 39.23%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 11 | 1.24M | 6m 35s | 100%
🟢 Database | `namespaces`: 3, `models`: 6 | 1.08M | 4m 45s | 100%
🟢 Interface | `operations`: 25, `schemas`: 34 | 16.80M | 14m 23s | 74%
🟢 Test | `functions`: 234 | 119.19M | 41m 6s | 25%
🟢 Realize | `functions`: 37 | 6.97M | 20m 12s | 78%


### `anthropic/claude-haiku-4.5` - `bbs`

- Source Code: [`anthropic/claude-haiku-4.5/bbs`](./anthropic/claude-haiku-4.5/bbs/)
- Score: 80
- Elapsed Time: 1h 45m 34s
- Token Usage: 293.56M
- Function Calling Success Rate: 35.54%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 8 | 573.8K | 4m 57s | 100%
🟢 Database | `namespaces`: 6, `models`: 21 | 1.42M | 5m 21s | 85%
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
🟢 Database | `namespaces`: 8, `models`: 36 | 2.37M | 5m 34s | 95%
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
🟢 Database | `namespaces`: 11, `models`: 66 | 4.64M | 26m 24s | 74%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `meta-llama/llama-4-maverick`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./meta-llama/llama-4-maverick/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./meta-llama/llama-4-maverick/bbs/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
`reddit` | 0 | ❌ | ❌ | ❌ | ❌ | ❌
`shopping` | 0 | ❌ | ❌ | ❌ | ❌ | ❌

### `meta-llama/llama-4-maverick` - `todo`

- Source Code: [`meta-llama/llama-4-maverick/todo`](./meta-llama/llama-4-maverick/todo/)
- Score: 100
- Elapsed Time: 40m 44s
- Token Usage: 20.57M
- Function Calling Success Rate: 60.45%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 5 | 205.6K | 11s | 100%
🟢 Database | `namespaces`: 2, `models`: 3 | 126.7K | 26s | 100%
🟢 Interface | `operations`: 14, `schemas`: 22 | 9.84M | 12m 41s | 42%
🟢 Test | `functions`: 13 | 3.30M | 3m 12s | 79%
🟢 Realize | `functions`: 20 | 7.10M | 24m 12s | 71%


### `meta-llama/llama-4-maverick` - `bbs`

- Source Code: [`meta-llama/llama-4-maverick/bbs`](./meta-llama/llama-4-maverick/bbs/)
- Score: 100
- Elapsed Time: 2h 1m 36s
- Token Usage: 60.87M
- Function Calling Success Rate: 69.65%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 7 | 312.9K | 14s | 94%
🟢 Database | `namespaces`: 5, `models`: 13 | 296.8K | 35s | 100%
🟢 Interface | `operations`: 52, `schemas`: 66 | 19.91M | 10m 36s | 76%
🟢 Test | `functions`: 37 | 7.42M | 7m 46s | 96%
🟢 Realize | `functions`: 77 | 32.93M | 1h 42m 24s | 61%


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
- Elapsed Time: 1h 48m 59s
- Token Usage: 18.16M
- Function Calling Success Rate: 95.58%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 12 | 464.9K | 5m 58s | 100%
🟢 Database | `namespaces`: 4, `models`: 7 | 309.4K | 4m 5s | 100%
🟢 Interface | `operations`: 34, `schemas`: 40 | 9.41M | 40m 37s | 90%
🟢 Test | `functions`: 42 | 5.08M | 13m 24s | 98%
🟢 Realize | `functions`: 34 | 2.90M | 44m 54s | 99%


### `x-ai/grok-code-fast-1` - `bbs`

- Source Code: [`x-ai/grok-code-fast-1/bbs`](./x-ai/grok-code-fast-1/bbs/)
- Score: 30
- Elapsed Time: 8m 53s
- Token Usage: 864.2K
- Function Calling Success Rate: 100.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 540.6K | 5m 1s | 100%
🟢 Database | `namespaces`: 3, `models`: 8 | 323.5K | 3m 51s | 100%
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
🟢 Database | `namespaces`: 6, `models`: 14 | 826.0K | 3m 21s | 100%
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
🟢 Database | `namespaces`: 8, `models`: 22 | 1.14M | 2m 49s | 95%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `qwen/qwen3-coder-exacto`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3-coder-exacto/todo/) | 90 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`bbs`](./qwen/qwen3-coder-exacto/bbs/) | 45 | 🟢 | 🟢 | 🟡 | ❌ | ❌
[`reddit`](./qwen/qwen3-coder-exacto/reddit/) | 20 | 🟢 | 🟡 | ❌ | ❌ | ❌
[`shopping`](./qwen/qwen3-coder-exacto/shopping/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌

### `qwen/qwen3-coder:exacto` - `todo`

- Source Code: [`qwen/qwen3-coder-exacto/todo`](./qwen/qwen3-coder-exacto/todo/)
- Score: 90
- Elapsed Time: 3h 51m 11s
- Token Usage: 220.40M
- Function Calling Success Rate: 26.07%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 12 | 1.02M | 8m 40s | 81%
🟢 Database | `namespaces`: 5, `models`: 11 | 3.78M | 8m 40s | 79%
🟢 Interface | `operations`: 31, `schemas`: 36 | 188.40M | 2h 57m 2s | 21%
🟢 Test | `functions`: 46 | 27.19M | 36m 48s | 31%
🔴 Realize |  | 1.62M | 0s | 17%


### `qwen/qwen3-coder:exacto` - `bbs`

- Source Code: [`qwen/qwen3-coder-exacto/bbs`](./qwen/qwen3-coder-exacto/bbs/)
- Score: 45
- Elapsed Time: 24m 28s
- Token Usage: 12.16M
- Function Calling Success Rate: 77.43%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 1.25M | 7m 17s | 81%
🟢 Database | `namespaces`: 6, `models`: 35 | 10.91M | 17m 10s | 76%
🔴 Interface |  | 164.93M | 0s | 33%
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `qwen/qwen3-coder:exacto` - `reddit`

- Source Code: [`qwen/qwen3-coder-exacto/reddit`](./qwen/qwen3-coder-exacto/reddit/)
- Score: 20
- Elapsed Time: 10m 51s
- Token Usage: 1.21M
- Function Calling Success Rate: 90.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 12 | 1.21M | 10m 51s | 90%
🔴 Database |  | 5.50M | 0s | 29%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `qwen/qwen3-coder:exacto` - `shopping`

- Source Code: [`qwen/qwen3-coder-exacto/shopping`](./qwen/qwen3-coder-exacto/shopping/)
- Score: 30
- Elapsed Time: 1h 9m 7s
- Token Usage: 25.09M
- Function Calling Success Rate: 76.18%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 13 | 1.26M | 11m 1s | 87%
🟢 Database | `namespaces`: 12, `models`: 72 | 22.56M | 47m 4s | 73%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `mistralai/codestral-2508`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./mistralai/codestral-2508/todo/) | 90 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`bbs`](./mistralai/codestral-2508/bbs/) | 20 | 🟢 | 🟡 | ❌ | ❌ | ❌
[`reddit`](./mistralai/codestral-2508/reddit/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌
[`shopping`](./mistralai/codestral-2508/shopping/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌

### `mistralai/codestral-2508` - `todo`

- Source Code: [`mistralai/codestral-2508/todo`](./mistralai/codestral-2508/todo/)
- Score: 90
- Elapsed Time: 1h 24m 55s
- Token Usage: 13.09M
- Function Calling Success Rate: 95.17%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 425.2K | 5m 13s | 100%
🟢 Database | `namespaces`: 2, `models`: 3 | 156.2K | 3m 20s | 100%
🟢 Interface | `operations`: 18, `schemas`: 26 | 6.04M | 28m 11s | 88%
🟢 Test | `functions`: 29 | 3.01M | 9m 26s | 97%
🔴 Realize | `functions`: 18, `errors`: 1 | 3.47M | 38m 43s | 99%


### `mistralai/codestral-2508` - `bbs`

- Source Code: [`mistralai/codestral-2508/bbs`](./mistralai/codestral-2508/bbs/)
- Score: 20
- Elapsed Time: 3m 10s
- Token Usage: 548.8K
- Function Calling Success Rate: 104.76%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 4 | 184.8K | 1m 21s | 111%
🔴 Database | `namespaces`: 5, `models`: 20 | 364.0K | 1m 49s | 100%
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
🟢 Database | `namespaces`: 6, `models`: 16 | 509.7K | 8m 44s | 100%
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
🟢 Database | `namespaces`: 10, `models`: 33 | 965.1K | 9m 18s | 100%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


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
🟢 Database | `namespaces`: 2, `models`: 5 | 169.7K | 5m 11s | 100%
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
🟢 Database | `namespaces`: 9, `models`: 18 | 513.0K | 52s | 94%
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
🟢 Database | `namespaces`: 11, `models`: 22 | 616.6K | 59s | 100%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `deepseek/deepseek-v3.1-terminus-exacto`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./deepseek/deepseek-v3.1-terminus-exacto/todo/) | 45 | 🟢 | 🟢 | 🟡 | ❌ | ❌
[`bbs`](./deepseek/deepseek-v3.1-terminus-exacto/bbs/) | 45 | 🟢 | 🟢 | 🟡 | ❌ | ❌
[`reddit`](./deepseek/deepseek-v3.1-terminus-exacto/reddit/) | 20 | 🟢 | 🟡 | ❌ | ❌ | ❌
[`shopping`](./deepseek/deepseek-v3.1-terminus-exacto/shopping/) | 45 | 🟢 | 🟢 | 🟡 | ❌ | ❌

### `deepseek/deepseek-v3.1-terminus:exacto` - `todo`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/todo`](./deepseek/deepseek-v3.1-terminus-exacto/todo/)
- Score: 45
- Elapsed Time: 17m 57s
- Token Usage: 7.88M
- Function Calling Success Rate: 93.10%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 963.7K | 5m 9s | 100%
🟢 Database | `namespaces`: 5, `models`: 29 | 6.92M | 12m 48s | 91%
🔴 Interface |  | 1.93M | 0s | 88%
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `deepseek/deepseek-v3.1-terminus:exacto` - `bbs`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/bbs`](./deepseek/deepseek-v3.1-terminus-exacto/bbs/)
- Score: 45
- Elapsed Time: 25m 20s
- Token Usage: 10.64M
- Function Calling Success Rate: 95.56%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 1.10M | 7m 28s | 100%
🟢 Database | `namespaces`: 8, `models`: 46 | 9.54M | 17m 52s | 94%
🔴 Interface |  | 2.64M | 0s | 82%
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `deepseek/deepseek-v3.1-terminus:exacto` - `reddit`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/reddit`](./deepseek/deepseek-v3.1-terminus-exacto/reddit/)
- Score: 20
- Elapsed Time: 5m 41s
- Token Usage: 1.09M
- Function Calling Success Rate: 100.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 1.09M | 5m 41s | 100%
🔴 Database |  | 4.41M | 0s | 85%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `deepseek/deepseek-v3.1-terminus:exacto` - `shopping`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/shopping`](./deepseek/deepseek-v3.1-terminus-exacto/shopping/)
- Score: 45
- Elapsed Time: 42m 12s
- Token Usage: 23.51M
- Function Calling Success Rate: 90.70%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 21 | 2.23M | 8m 2s | 98%
🟢 Database | `namespaces`: 10, `models`: 104 | 21.28M | 34m 9s | 89%
🔴 Interface |  | 3.93M | 0s | 80%
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
🟢 Database | `namespaces`: 2, `models`: 3 | 162.7K | 4m 5s | 100%
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
⚪ Database |  |  |  | 
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
🟢 Database | `namespaces`: 2, `models`: 5 | 165.3K | 5m 45s | 100%
🟢 Interface | `operations`: 28, `schemas`: 37 | 9.32M | 36m 47s | 87%
🟢 Test | `functions`: 45 | 4.92M | 13m 57s | 96%
🟢 Realize | `functions`: 28 | 1.79M | 26m 9s | 100%


## `openai/gpt-5-mini`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./openai/gpt-5-mini/todo/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌
`bbs` | 0 | ❌ | ❌ | ❌ | ❌ | ❌
`reddit` | 0 | ❌ | ❌ | ❌ | ❌ | ❌
`shopping` | 0 | ❌ | ❌ | ❌ | ❌ | ❌

### `openai/gpt-5-mini` - `todo`

- Source Code: [`openai/gpt-5-mini/todo`](./openai/gpt-5-mini/todo/)
- Score: 30
- Elapsed Time: 26m 45s
- Token Usage: 10.20M
- Function Calling Success Rate: 92.95%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 544.1K | 5m 39s | 100%
🟢 Database | `namespaces`: 6, `models`: 81 | 9.11M | 15m 26s | 91%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `moonshotai/kimi-k2.5`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./moonshotai/kimi-k2.5/todo/) | 10 | 🟢 | ❌ | ❌ | ❌ | ❌
`bbs` | 0 | ❌ | ❌ | ❌ | ❌ | ❌
`reddit` | 0 | ❌ | ❌ | ❌ | ❌ | ❌
`shopping` | 0 | ❌ | ❌ | ❌ | ❌ | ❌

### `moonshotai/kimi-k2.5` - `todo`

- Source Code: [`moonshotai/kimi-k2.5/todo`](./moonshotai/kimi-k2.5/todo/)
- Score: 10
- Elapsed Time: 30m 5s
- Token Usage: 650.8K
- Function Calling Success Rate: 100.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 11 | 650.8K | 30m 5s | 100%
⚪ Database |  |  |  | 
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


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
⚪ Database |  |  |  | 
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
⚪ Database |  |  |  | 
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
⚪ Database |  |  |  | 
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `qwen/qwen3-next-80b-a3b-thinking`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
`todo` | 0 | ❌ | ❌ | ❌ | ❌ | ❌
`bbs` | 0 | ❌ | ❌ | ❌ | ❌ | ❌
`reddit` | 0 | ❌ | ❌ | ❌ | ❌ | ❌
`shopping` | 0 | ❌ | ❌ | ❌ | ❌ | ❌

