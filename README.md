# AutoBe Generated Examples

## Benchmark

AI Model | Score | FCSR | Status 
:--------|------:|-----:|:------:
[`anthropic/claude-sonnet-4.5`](#anthropicclaude-sonnet-45) | 100 | 92% | 🟢
[`openai/gpt-4.1`](#openaigpt-41) | 100 | 89% | 🟢
[`openai/gpt-4.1-mini`](#openaigpt-41-mini) | 100 | 84% | 🟢
[`openai/gpt-5.1`](#openaigpt-51) | 87.5 | 80% | 🟡
[`moonshotai/kimi-k2-0905-exacto`](#moonshotaikimi-k2-0905-exacto) | 77.5 | 85% | 🟡
[`qwen/qwen3-next-80b-a3b-instruct`](#qwenqwen3-next-80b-a3b-instruct) | 75 | 69% | 🟡
[`anthropic/claude-haiku-4.5`](#anthropicclaude-haiku-45) | 72.5 | 43% | 🟡
[`qwen/qwen3-coder-exacto`](#qwenqwen3-coder-exacto) | 55 | 59% | 🟡
[`deepseek/deepseek-v3.1-terminus-exacto`](#deepseekdeepseek-v31-terminus-exacto) | 47.5 | 94% | 🟡
[`mistralai/codestral-2508`](#mistralaicodestral-2508) | 47.5 | 94% | 🟡
[`x-ai/grok-code-fast-1`](#x-aigrok-code-fast-1) | 47.5 | 96% | 🟡
[`meta-llama/llama-4-scout`](#meta-llamallama-4-scout) | 40 | 95% | 🟡
[`meta-llama/llama-4-maverick`](#meta-llamallama-4-maverick) | 32.5 | 95% | 🟡
[`google/gemini-2.5-pro`](#googlegemini-25-pro) | 25 | 94% | 🟡
[`z-ai/glm-4.6-exacto`](#z-aiglm-46-exacto) | 25 | 93% | 🟡

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
- Elapsed Time: 1h 41m 45s
- Token Usage: 17.54M
- Function Calling Success Rate: 90.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 11 | 438.8K | 6m 41s | 100%
🟢 Prisma | `namespaces`: 2, `models`: 7 | 389.3K | 10m 49s | 50%
🟢 Interface | `operations`: 29, `schemas`: 41 | 9.89M | 25m 40s | 84%
🟢 Test | `functions`: 37 | 4.05M | 9m 32s | 100%
🟢 Realize | `functions`: 29 | 2.77M | 49m 1s | 94%


### `anthropic/claude-sonnet-4.5` - `bbs`

- Source Code: [`anthropic/claude-sonnet-4.5/bbs`](./anthropic/claude-sonnet-4.5/bbs/)
- Score: 100
- Elapsed Time: 58m 50s
- Token Usage: 49.87M
- Function Calling Success Rate: 95.54%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 4 | 285.2K | 8m 36s | 100%
🟢 Prisma | `namespaces`: 4, `models`: 9 | 512.1K | 5m 57s | 100%
🟢 Interface | `operations`: 49, `schemas`: 53 | 16.10M | 15m 2s | 94%
🟢 Test | `functions`: 223 | 27.48M | 16m 49s | 96%
🟢 Realize | `functions`: 49 | 5.48M | 12m 24s | 94%


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
- Elapsed Time: 53m 54s
- Token Usage: 11.79M
- Function Calling Success Rate: 93.06%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 432.9K | 4m 6s | 100%
🟢 Prisma | `namespaces`: 2, `models`: 3 | 156.8K | 2m 50s | 100%
🟢 Interface | `operations`: 18, `schemas`: 29 | 6.59M | 27m 44s | 89%
🟢 Test | `functions`: 23 | 3.28M | 6m 16s | 95%
🟢 Realize | `functions`: 18 | 1.33M | 12m 56s | 94%


### `openai/gpt-4.1` - `bbs`

- Source Code: [`openai/gpt-4.1/bbs`](./openai/gpt-4.1/bbs/)
- Score: 100
- Elapsed Time: 1h 52m 2s
- Token Usage: 35.82M
- Function Calling Success Rate: 90.18%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 11 | 701.4K | 6m 42s | 79%
🟢 Prisma | `namespaces`: 5, `models`: 12 | 367.3K | 2m 25s | 100%
🟢 Interface | `operations`: 63, `schemas`: 71 | 19.49M | 24m 5s | 82%
🟢 Test | `functions`: 71 | 8.21M | 9m 26s | 97%
🟢 Realize | `functions`: 63 | 7.04M | 1h 9m 22s | 100%


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
- Elapsed Time: 1h 14m 33s
- Token Usage: 8.54M
- Function Calling Success Rate: 90.81%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 410.2K | 4m 51s | 100%
🟢 Prisma | `namespaces`: 2, `models`: 3 | 157.4K | 3m 7s | 100%
🟢 Interface | `operations`: 14, `schemas`: 18 | 4.89M | 40m 44s | 82%
🟢 Test | `functions`: 6 | 1.88M | 5m 5s | 100%
🟢 Realize | `functions`: 14 | 1.20M | 20m 43s | 95%


### `openai/gpt-4.1-mini` - `bbs`

- Source Code: [`openai/gpt-4.1-mini/bbs`](./openai/gpt-4.1-mini/bbs/)
- Score: 100
- Elapsed Time: 57m 5s
- Token Usage: 40.75M
- Function Calling Success Rate: 74.64%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 472.0K | 2m 49s | 100%
🟢 Prisma | `namespaces`: 3, `models`: 9 | 293.4K | 1m 47s | 77%
🟢 Interface | `operations`: 53, `schemas`: 63 | 25.75M | 22m 13s | 60%
🟢 Test | `functions`: 41 | 7.16M | 12m 34s | 82%
🟢 Realize | `functions`: 53 | 7.08M | 17m 40s | 94%


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


## `openai/gpt-5.1`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./openai/gpt-5.1/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./openai/gpt-5.1/bbs/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./openai/gpt-5.1/reddit/) | 80 | 🟢 | 🟢 | 🟢 | 🟢 | ❌
[`shopping`](./openai/gpt-5.1/shopping/) | 70 | 🟢 | 🟢 | 🟢 | 🟡 | ❌

### `openai/gpt-5.1` - `todo`

- Source Code: [`openai/gpt-5.1/todo`](./openai/gpt-5.1/todo/)
- Score: 100
- Elapsed Time: 1h 20m 52s
- Token Usage: 9.19M
- Function Calling Success Rate: 93.85%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 437.7K | 5m 23s | 100%
🟢 Prisma | `namespaces`: 2, `models`: 3 | 158.2K | 3m 20s | 100%
🟢 Interface | `operations`: 14, `schemas`: 17 | 4.54M | 36m 31s | 90%
🟢 Test | `functions`: 14 | 2.91M | 19m 46s | 97%
🟢 Realize | `functions`: 14 | 1.15M | 15m 51s | 93%


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
- Score: 70
- Elapsed Time: 3h 57m 39s
- Token Usage: 512.37M
- Function Calling Success Rate: 77.04%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 13 | 1.39M | 20m 41s | 100%
🟢 Prisma | `namespaces`: 10, `models`: 90 | 1.87M | 11m 2s | 84%
🟢 Interface | `operations`: 503, `schemas`: 698 | 286.62M | 1h 38m 8s | 64%
🔴 Test | `functions`: 1273, `errors`: 2 | 222.49M | 1h 47m 47s | 98%
⚪ Realize |  |  |  | 


## `moonshotai/kimi-k2-0905-exacto`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./moonshotai/kimi-k2-0905-exacto/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./moonshotai/kimi-k2-0905-exacto/bbs/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./moonshotai/kimi-k2-0905-exacto/reddit/) | 80 | 🟢 | 🟢 | 🟢 | 🟢 | ❌
[`shopping`](./moonshotai/kimi-k2-0905-exacto/shopping/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌

### `moonshotai/kimi-k2-0905-exacto` - `todo`

- Source Code: [`moonshotai/kimi-k2-0905-exacto/todo`](./moonshotai/kimi-k2-0905-exacto/todo/)
- Score: 100
- Elapsed Time: 1h 19m 27s
- Token Usage: 17.98M
- Function Calling Success Rate: 95.66%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 11 | 432.5K | 4m 25s | 100%
🟢 Prisma | `namespaces`: 3, `models`: 7 | 271.3K | 5m 43s | 87%
🟢 Interface | `operations`: 35, `schemas`: 44 | 10.28M | 37m 12s | 93%
🟢 Test | `functions`: 48 | 5.08M | 12m 48s | 98%
🟢 Realize | `functions`: 35 | 1.92M | 19m 17s | 97%


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
- Score: 30
- Elapsed Time: 24m 57s
- Token Usage: 2.93M
- Function Calling Success Rate: 78.13%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 12 | 808.1K | 10m 17s | 96%
🟢 Prisma | `namespaces`: 10, `models`: 46 | 2.12M | 14m 40s | 65%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `qwen/qwen3-next-80b-a3b-instruct`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3-next-80b-a3b-instruct/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./qwen/qwen3-next-80b-a3b-instruct/bbs/) | 90 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`reddit`](./qwen/qwen3-next-80b-a3b-instruct/reddit/) | 80 | 🟢 | 🟢 | 🟢 | 🟢 | ❌
[`shopping`](./qwen/qwen3-next-80b-a3b-instruct/shopping/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌

### `qwen/qwen3-next-80b-a3b-instruct` - `todo`

- Source Code: [`qwen/qwen3-next-80b-a3b-instruct/todo`](./qwen/qwen3-next-80b-a3b-instruct/todo/)
- Score: 100
- Elapsed Time: 1h 5m 11s
- Token Usage: 8.83M
- Function Calling Success Rate: 94.33%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 404.6K | 4m 16s | 100%
🟢 Prisma | `namespaces`: 2, `models`: 3 | 153.0K | 2m 50s | 100%
🟢 Interface | `operations`: 14, `schemas`: 21 | 5.07M | 31m 37s | 91%
🟢 Test | `functions`: 20 | 2.05M | 8m 24s | 100%
🟢 Realize | `functions`: 14 | 1.15M | 18m 1s | 93%


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
- Score: 80
- Elapsed Time: 2h 43m 40s
- Token Usage: 112.60M
- Function Calling Success Rate: 63.05%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 11 | 766.0K | 4m 19s | 100%
🟢 Prisma | `namespaces`: 10, `models`: 66 | 1.97M | 21m 5s | 80%
🟢 Interface | `operations`: 99, `schemas`: 91 | 62.34M | 1h 47m 32s | 54%
🟢 Test | `functions`: 156 | 47.52M | 30m 42s | 73%
⚪ Realize |  |  |  | 


### `qwen/qwen3-next-80b-a3b-instruct` - `shopping`

- Source Code: [`qwen/qwen3-next-80b-a3b-instruct/shopping`](./qwen/qwen3-next-80b-a3b-instruct/shopping/)
- Score: 30
- Elapsed Time: 4m 25s
- Token Usage: 1.91M
- Function Calling Success Rate: 95.92%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 715.5K | 1m 32s | 100%
🟢 Prisma | `namespaces`: 10, `models`: 56 | 1.20M | 2m 52s | 92%
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
- Elapsed Time: 54m 3s
- Token Usage: 8.64M
- Function Calling Success Rate: 94.44%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 409.1K | 6m 49s | 100%
🟢 Prisma | `namespaces`: 2, `models`: 3 | 155.7K | 4m 7s | 100%
🟢 Interface | `operations`: 15, `schemas`: 19 | 4.51M | 21m 27s | 89%
🟢 Test | `functions`: 23 | 2.40M | 7m 18s | 100%
🟢 Realize | `functions`: 15 | 1.16M | 14m 20s | 96%


### `anthropic/claude-haiku-4.5` - `bbs`

- Source Code: [`anthropic/claude-haiku-4.5/bbs`](./anthropic/claude-haiku-4.5/bbs/)
- Score: 80
- Elapsed Time: 1h 2m 14s
- Token Usage: 288.42M
- Function Calling Success Rate: 42.19%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 1.37M | 7m 6s | 100%
🟢 Prisma | `namespaces`: 7, `models`: 14 | 2.27M | 6m 32s | 91%
🟢 Interface | `operations`: 81, `schemas`: 88 | 42.23M | 13m 55s | 79%
🟢 Test | `functions`: 218 | 242.55M | 34m 40s | 32%
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
`shopping` | 0 | ❌ | ❌ | ❌ | ❌ | ❌

### `qwen/qwen3-coder-exacto` - `todo`

- Source Code: [`qwen/qwen3-coder-exacto/todo`](./qwen/qwen3-coder-exacto/todo/)
- Score: 100
- Elapsed Time: 1h 15m 34s
- Token Usage: 8.56M
- Function Calling Success Rate: 92.06%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 406.7K | 4m 12s | 100%
🟢 Prisma | `namespaces`: 2, `models`: 3 | 157.3K | 5m 24s | 100%
🟢 Interface | `operations`: 14, `schemas`: 18 | 4.62M | 27m 45s | 85%
🟢 Test | `functions`: 20 | 2.12M | 15m 51s | 100%
🟢 Realize | `functions`: 14 | 1.25M | 22m 19s | 93%


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


## `deepseek/deepseek-v3.1-terminus-exacto`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./deepseek/deepseek-v3.1-terminus-exacto/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./deepseek/deepseek-v3.1-terminus-exacto/bbs/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌
[`reddit`](./deepseek/deepseek-v3.1-terminus-exacto/reddit/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌
[`shopping`](./deepseek/deepseek-v3.1-terminus-exacto/shopping/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌

### `deepseek/deepseek-v3.1-terminus-exacto` - `todo`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/todo`](./deepseek/deepseek-v3.1-terminus-exacto/todo/)
- Score: 100
- Elapsed Time: 1h 46m 27s
- Token Usage: 22.87M
- Function Calling Success Rate: 93.91%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 12 | 449.1K | 3m 29s | 100%
🟢 Prisma | `namespaces`: 4, `models`: 9 | 299.0K | 5m 56s | 100%
🟢 Interface | `operations`: 39, `schemas`: 50 | 12.84M | 58m 20s | 88%
🟢 Test | `functions`: 57 | 6.24M | 10m 48s | 100%
🟢 Realize | `functions`: 39 | 3.03M | 27m 52s | 97%


### `deepseek/deepseek-v3.1-terminus-exacto` - `bbs`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/bbs`](./deepseek/deepseek-v3.1-terminus-exacto/bbs/)
- Score: 30
- Elapsed Time: 15m 12s
- Token Usage: 1.35M
- Function Calling Success Rate: 92.11%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 10 | 538.1K | 5m 45s | 100%
🟢 Prisma | `namespaces`: 6, `models`: 26 | 816.5K | 9m 26s | 82%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `deepseek/deepseek-v3.1-terminus-exacto` - `reddit`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/reddit`](./deepseek/deepseek-v3.1-terminus-exacto/reddit/)
- Score: 30
- Elapsed Time: 20m 3s
- Token Usage: 1.94M
- Function Calling Success Rate: 95.92%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 11 | 660.8K | 6m 43s | 100%
🟢 Prisma | `namespaces`: 10, `models`: 52 | 1.28M | 13m 19s | 92%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `deepseek/deepseek-v3.1-terminus-exacto` - `shopping`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/shopping`](./deepseek/deepseek-v3.1-terminus-exacto/shopping/)
- Score: 30
- Elapsed Time: 21m 45s
- Token Usage: 2.02M
- Function Calling Success Rate: 95.92%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 759.5K | 6m 17s | 100%
🟢 Prisma | `namespaces`: 10, `models`: 58 | 1.26M | 15m 28s | 91%
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
- Elapsed Time: 2m 20s
- Token Usage: 500.0K
- Function Calling Success Rate: 100.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 4 | 152.7K | 59s | 100%
🟢 Prisma | `namespaces`: 5, `models`: 16 | 347.2K | 1m 20s | 100%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `mistralai/codestral-2508` - `reddit`

- Source Code: [`mistralai/codestral-2508/reddit`](./mistralai/codestral-2508/reddit/)
- Score: 30
- Elapsed Time: 33m 25s
- Token Usage: 1.25M
- Function Calling Success Rate: 100.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 10 | 474.2K | 31m 25s | 100%
🟢 Prisma | `namespaces`: 10, `models`: 24 | 777.9K | 2m 0s | 100%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `mistralai/codestral-2508` - `shopping`

- Source Code: [`mistralai/codestral-2508/shopping`](./mistralai/codestral-2508/shopping/)
- Score: 30
- Elapsed Time: 34m 8s
- Token Usage: 1.54M
- Function Calling Success Rate: 97.83%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 562.1K | 32m 11s | 100%
🟢 Prisma | `namespaces`: 10, `models`: 31 | 974.7K | 1m 56s | 95%
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
- Elapsed Time: 4m 40s
- Token Usage: 1.05M
- Function Calling Success Rate: 100.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 642.6K | 2m 9s | 100%
🟢 Prisma | `namespaces`: 3, `models`: 14 | 403.4K | 2m 31s | 100%
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


## `meta-llama/llama-4-maverick`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./meta-llama/llama-4-maverick/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./meta-llama/llama-4-maverick/bbs/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌
`reddit` | 0 | ❌ | ❌ | ❌ | ❌ | ❌
`shopping` | 0 | ❌ | ❌ | ❌ | ❌ | ❌

### `meta-llama/llama-4-maverick` - `todo`

- Source Code: [`meta-llama/llama-4-maverick/todo`](./meta-llama/llama-4-maverick/todo/)
- Score: 100
- Elapsed Time: 55m 18s
- Token Usage: 6.88M
- Function Calling Success Rate: 96.10%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 483.9K | 9m 20s | 100%
🟢 Prisma | `namespaces`: 2, `models`: 3 | 156.3K | 3m 15s | 100%
🟢 Interface | `operations`: 11, `schemas`: 16 | 3.44M | 16m 24s | 95%
🟢 Test | `functions`: 18 | 1.96M | 11m 11s | 96%
🟢 Realize | `functions`: 11 | 838.6K | 15m 5s | 94%


### `meta-llama/llama-4-maverick` - `bbs`

- Source Code: [`meta-llama/llama-4-maverick/bbs`](./meta-llama/llama-4-maverick/bbs/)
- Score: 30
- Elapsed Time: 2m 4s
- Token Usage: 749.7K
- Function Calling Success Rate: 94.59%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 400.3K | 1m 7s | 95%
🟢 Prisma | `namespaces`: 5, `models`: 10 | 349.5K | 57s | 92%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `google/gemini-2.5-pro`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./google/gemini-2.5-pro/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
`bbs` | 0 | ❌ | ❌ | ❌ | ❌ | ❌
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