# AutoBe Generated Examples

## Benchmark

AI Model | Score | FCSR | Status 
:--------|------:|-----:|:------:
[`openai/gpt-4.1`](#openaigpt-41) | 100 | 90% | 🟢
[`openai/gpt-4.1-mini`](#openaigpt-41-mini) | 100 | 76% | 🟢
[`openai/gpt-5-mini`](#openaigpt-5-mini) | 82.5 | 85% | 🟢
[`anthropic/claude-sonnet-4.5`](#anthropicclaude-sonnet-45) | 65 | 69% | 🟡
[`moonshotai/kimi-k2-0905-exacto`](#moonshotaikimi-k2-0905-exacto) | 65 | 61% | 🟡
[`openai/gpt-5`](#openaigpt-5) | 57.5 | 92% | 🟡
[`anthropic/claude-haiku-4.5`](#anthropicclaude-haiku-45) | 55 | 40% | 🟡
[`qwen/qwen3-next-80b-a3b-instruct`](#qwenqwen3-next-80b-a3b-instruct) | 55 | 70% | 🟡
[`deepseek/deepseek-v3.1-terminus-exacto`](#deepseekdeepseek-v31-terminus-exacto) | 47.5 | 79% | 🟡
[`qwen/qwen3-30b-a3b-thinking-2507`](#qwenqwen3-30b-a3b-thinking-2507) | 33.75 | 66% | ❌
[`meta-llama/llama-4-maverick`](#meta-llamallama-4-maverick) | 12.5 | 94% | ❌
[`google/gemini-2.5-pro`](#googlegemini-25-pro) | 10 | 97% | ❌

- FCSR: Function Calling Success Rate
- Status:
  - 🟢: All projects completed successfully
  - 🟡: Some projects failed
  - ❌: All projects failed or not executed

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
- Elapsed Time: 23m 2s
- Token Usage: 7.09M
- Function Calling Success Rate: 96.23%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 490.1K | 2m 55s | 100%
🟢 Prisma | `namespaces`: 2, `models`: 3 | 177.0K | 1m 37s | 100%
🟢 Interface | `operations`: 15, `schemas`: 19 | 3.46M | 7m 41s | 91%
🟢 Test | `functions`: 16 | 1.79M | 4m 36s | 100%
🟢 Realize | `functions`: 15 | 1.17M | 6m 11s | 100%


### `openai/gpt-4.1` - `bbs`

- Source Code: [`openai/gpt-4.1/bbs`](./openai/gpt-4.1/bbs/)
- Score: 100
- Elapsed Time: 52m 29s
- Token Usage: 28.72M
- Function Calling Success Rate: 91.72%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 11 | 497.8K | 6m 8s | 85%
🟢 Prisma | `namespaces`: 3, `models`: 10 | 318.1K | 3m 52s | 100%
🟢 Interface | `operations`: 57, `schemas`: 62 | 14.93M | 23m 43s | 86%
🟢 Test | `functions`: 40 | 8.70M | 7m 35s | 96%
🟢 Realize | `functions`: 57 | 4.28M | 11m 9s | 100%


### `openai/gpt-4.1` - `reddit`

- Source Code: [`openai/gpt-4.1/reddit`](./openai/gpt-4.1/reddit/)
- Score: 100
- Elapsed Time: 1h 42m 33s
- Token Usage: 111.61M
- Function Calling Success Rate: 92.87%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 11 | 593.4K | 5m 32s | 95%
🟢 Prisma | `namespaces`: 10, `models`: 40 | 1.22M | 3m 25s | 100%
🟢 Interface | `operations`: 161, `schemas`: 175 | 61.07M | 55m 12s | 87%
🟢 Test | `functions`: 159 | 32.49M | 14m 30s | 98%
🟢 Realize | `functions`: 161 | 16.23M | 23m 52s | 97%


### `openai/gpt-4.1` - `shopping`

- Source Code: [`openai/gpt-4.1/shopping`](./openai/gpt-4.1/shopping/)
- Score: 100
- Elapsed Time: 2h 40m 18s
- Token Usage: 384.86M
- Function Calling Success Rate: 89.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 15 | 946.3K | 4m 8s | 100%
🟢 Prisma | `namespaces`: 11, `models`: 69 | 2.05M | 7m 55s | 92%
🟢 Interface | `operations`: 366, `schemas`: 328 | 213.38M | 1h 17m 27s | 79%
🟢 Test | `functions`: 339 | 113.95M | 28m 3s | 96%
🟢 Realize | `functions`: 366 | 54.53M | 42m 43s | 99%


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
- Elapsed Time: 1h 6m 32s
- Token Usage: 8.97M
- Function Calling Success Rate: 84.98%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 4 | 165.8K | 2m 15s | 90%
🟢 Prisma | `namespaces`: 2, `models`: 3 | 115.6K | 1m 3s | 100%
🟢 Interface | `operations`: 18, `schemas`: 23 | 3.90M | 31m 27s | 77%
🟢 Test | `functions`: 25 | 3.35M | 16m 21s | 88%
🟢 Realize | `functions`: 18 | 1.43M | 15m 24s | 97%


### `openai/gpt-4.1-mini` - `bbs`

- Source Code: [`openai/gpt-4.1-mini/bbs`](./openai/gpt-4.1-mini/bbs/)
- Score: 100
- Elapsed Time: 1h 35m 40s
- Token Usage: 15.06M
- Function Calling Success Rate: 82.20%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 4 | 152.6K | 2m 25s | 90%
🟢 Prisma | `namespaces`: 3, `models`: 7 | 243.3K | 1m 25s | 77%
🟢 Interface | `operations`: 30, `schemas`: 37 | 6.85M | 1h 10m 50s | 69%
🟢 Test | `functions`: 38 | 5.25M | 12m 40s | 94%
🟢 Realize | `functions`: 30 | 2.56M | 8m 18s | 98%


### `openai/gpt-4.1-mini` - `reddit`

- Source Code: [`openai/gpt-4.1-mini/reddit`](./openai/gpt-4.1-mini/reddit/)
- Score: 100
- Elapsed Time: 2h 18m 34s
- Token Usage: 92.96M
- Function Calling Success Rate: 78.92%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 11 | 607.5K | 12m 13s | 82%
🟢 Prisma | `namespaces`: 8, `models`: 23 | 920.3K | 2m 40s | 85%
🟢 Interface | `operations`: 137, `schemas`: 137 | 44.04M | 1h 11m 53s | 67%
🟢 Test | `functions`: 149 | 33.37M | 30m 49s | 83%
🟢 Realize | `functions`: 137 | 14.02M | 20m 56s | 98%


### `openai/gpt-4.1-mini` - `shopping`

- Source Code: [`openai/gpt-4.1-mini/shopping`](./openai/gpt-4.1-mini/shopping/)
- Score: 100
- Elapsed Time: 3h 22m 26s
- Token Usage: 179.97M
- Function Calling Success Rate: 72.80%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 10 | 474.3K | 12m 52s | 72%
🟢 Prisma | `namespaces`: 10, `models`: 39 | 1.29M | 2m 39s | 84%
🟢 Interface | `operations`: 205, `schemas`: 199 | 85.70M | 1h 32m 57s | 58%
🟢 Test | `functions`: 240 | 62.16M | 30m 0s | 77%
🟢 Realize | `functions`: 205 | 30.36M | 1h 3m 56s | 97%


## `openai/gpt-5-mini`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./openai/gpt-5-mini/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./openai/gpt-5-mini/bbs/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./openai/gpt-5-mini/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./openai/gpt-5-mini/shopping/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌

### `openai/gpt-5-mini` - `todo`

- Source Code: [`openai/gpt-5-mini/todo`](./openai/gpt-5-mini/todo/)
- Score: 100
- Elapsed Time: 3h 5m 54s
- Token Usage: 79.34M
- Function Calling Success Rate: 86.84%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 959.0K | 27m 47s | 95%
🟢 Prisma | `namespaces`: 5, `models`: 20 | 789.2K | 7m 10s | 100%
🟢 Interface | `operations`: 92, `schemas`: 124 | 50.05M | 51m 11s | 77%
🟢 Test | `functions`: 105 | 18.03M | 59m 14s | 98%
🟢 Realize | `functions`: 92 | 9.51M | 40m 29s | 96%


### `openai/gpt-5-mini` - `bbs`

- Source Code: [`openai/gpt-5-mini/bbs`](./openai/gpt-5-mini/bbs/)
- Score: 100
- Elapsed Time: 2h 9m 19s
- Token Usage: 102.47M
- Function Calling Success Rate: 86.59%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 871.4K | 9m 52s | 100%
🟢 Prisma | `namespaces`: 7, `models`: 25 | 1.17M | 9m 20s | 94%
🟢 Interface | `operations`: 105, `schemas`: 153 | 65.04M | 55m 13s | 77%
🟢 Test | `functions`: 126 | 23.45M | 20m 41s | 98%
🟢 Realize | `functions`: 105 | 11.95M | 34m 11s | 98%


### `openai/gpt-5-mini` - `reddit`

- Source Code: [`openai/gpt-5-mini/reddit`](./openai/gpt-5-mini/reddit/)
- Score: 100
- Elapsed Time: 3h 10m 27s
- Token Usage: 102.76M
- Function Calling Success Rate: 83.99%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 1.07M | 28m 27s | 96%
🟢 Prisma | `namespaces`: 10, `models`: 35 | 2.07M | 9m 47s | 95%
🟢 Interface | `operations`: 87, `schemas`: 132 | 69.07M | 1h 38m 35s | 72%
🟢 Test | `functions`: 107 | 20.21M | 22m 6s | 97%
🟢 Realize | `functions`: 87 | 10.34M | 31m 29s | 99%


### `openai/gpt-5-mini` - `shopping`

- Source Code: [`openai/gpt-5-mini/shopping`](./openai/gpt-5-mini/shopping/)
- Score: 30
- Elapsed Time: 25m 7s
- Token Usage: 3.22M
- Function Calling Success Rate: 91.84%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 1.03M | 11m 43s | 95%
🟢 Prisma | `namespaces`: 10, `models`: 50 | 2.19M | 13m 23s | 88%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `anthropic/claude-sonnet-4.5`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./anthropic/claude-sonnet-4.5/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./anthropic/claude-sonnet-4.5/bbs/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./anthropic/claude-sonnet-4.5/reddit/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌
[`shopping`](./anthropic/claude-sonnet-4.5/shopping/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌

### `anthropic/claude-sonnet-4.5` - `todo`

- Source Code: [`anthropic/claude-sonnet-4.5/todo`](./anthropic/claude-sonnet-4.5/todo/)
- Score: 100
- Elapsed Time: 1h 5m 15s
- Token Usage: 29.67M
- Function Calling Success Rate: 75.46%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 11 | 1.19M | 11m 44s | 82%
🟢 Prisma | `namespaces`: 2, `models`: 5 | 432.4K | 3m 28s | 100%
🟢 Interface | `operations`: 36, `schemas`: 35 | 13.94M | 32m 53s | 86%
🟢 Test | `functions`: 52 | 7.36M | 7m 5s | 94%
🟢 Realize | `functions`: 36 | 6.75M | 10m 3s | 42%


### `anthropic/claude-sonnet-4.5` - `bbs`

- Source Code: [`anthropic/claude-sonnet-4.5/bbs`](./anthropic/claude-sonnet-4.5/bbs/)
- Score: 100
- Elapsed Time: 2h 3m 5s
- Token Usage: 159.74M
- Function Calling Success Rate: 68.03%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 1.66M | 24m 41s | 63%
🟢 Prisma | `namespaces`: 6, `models`: 19 | 2.72M | 9m 22s | 66%
🟢 Interface | `operations`: 96, `schemas`: 117 | 86.48M | 36m 36s | 80%
🟢 Test | `functions`: 226 | 40.23M | 23m 14s | 86%
🟢 Realize | `functions`: 96 | 28.64M | 29m 9s | 32%


### `anthropic/claude-sonnet-4.5` - `reddit`

- Source Code: [`anthropic/claude-sonnet-4.5/reddit`](./anthropic/claude-sonnet-4.5/reddit/)
- Score: 30
- Elapsed Time: 25m 55s
- Token Usage: 4.78M
- Function Calling Success Rate: 70.91%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 1.66M | 14m 10s | 82%
🟢 Prisma | `namespaces`: 7, `models`: 30 | 3.12M | 11m 45s | 59%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `anthropic/claude-sonnet-4.5` - `shopping`

- Source Code: [`anthropic/claude-sonnet-4.5/shopping`](./anthropic/claude-sonnet-4.5/shopping/)
- Score: 30
- Elapsed Time: 40m 22s
- Token Usage: 8.36M
- Function Calling Success Rate: 73.33%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 16 | 3.45M | 28m 11s | 75%
🟢 Prisma | `namespaces`: 10, `models`: 69 | 4.91M | 12m 11s | 70%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `moonshotai/kimi-k2-0905-exacto`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./moonshotai/kimi-k2-0905-exacto/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./moonshotai/kimi-k2-0905-exacto/bbs/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./moonshotai/kimi-k2-0905-exacto/reddit/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌
[`shopping`](./moonshotai/kimi-k2-0905-exacto/shopping/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌

### `moonshotai/kimi-k2-0905-exacto` - `todo`

- Source Code: [`moonshotai/kimi-k2-0905-exacto/todo`](./moonshotai/kimi-k2-0905-exacto/todo/)
- Score: 100
- Elapsed Time: 1h 55m 7s
- Token Usage: 27.07M
- Function Calling Success Rate: 67.25%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 4 | 152.3K | 2m 49s | 100%
🟢 Prisma | `namespaces`: 3, `models`: 6 | 222.9K | 2m 5s | 100%
🟢 Interface | `operations`: 47, `schemas`: 40 | 14.85M | 1h 9m 32s | 50%
🟢 Test | `functions`: 53 | 8.10M | 24m 27s | 85%
🟢 Realize | `functions`: 47 | 3.74M | 16m 12s | 94%


### `moonshotai/kimi-k2-0905-exacto` - `bbs`

- Source Code: [`moonshotai/kimi-k2-0905-exacto/bbs`](./moonshotai/kimi-k2-0905-exacto/bbs/)
- Score: 100
- Elapsed Time: 3h 21m 30s
- Token Usage: 48.13M
- Function Calling Success Rate: 55.89%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 8 | 378.5K | 5m 31s | 100%
🟢 Prisma | `namespaces`: 5, `models`: 18 | 462.2K | 5m 33s | 92%
🟢 Interface | `operations`: 39, `schemas`: 69 | 30.54M | 1h 30m 29s | 42%
🟢 Test | `functions`: 47 | 9.37M | 29m 17s | 55%
🟢 Realize | `functions`: 39 | 7.38M | 1h 10m 39s | 90%


### `moonshotai/kimi-k2-0905-exacto` - `reddit`

- Source Code: [`moonshotai/kimi-k2-0905-exacto/reddit`](./moonshotai/kimi-k2-0905-exacto/reddit/)
- Score: 30
- Elapsed Time: 23m 3s
- Token Usage: 1.98M
- Function Calling Success Rate: 87.76%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 12 | 700.7K | 12m 25s | 89%
🟢 Prisma | `namespaces`: 8, `models`: 44 | 1.28M | 10m 37s | 85%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `moonshotai/kimi-k2-0905-exacto` - `shopping`

- Source Code: [`moonshotai/kimi-k2-0905-exacto/shopping`](./moonshotai/kimi-k2-0905-exacto/shopping/)
- Score: 30
- Elapsed Time: 42m 23s
- Token Usage: 2.01M
- Function Calling Success Rate: 74.07%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 10 | 587.8K | 12m 40s | 87%
🟢 Prisma | `namespaces`: 8, `models`: 47 | 1.42M | 29m 43s | 63%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `openai/gpt-5`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./openai/gpt-5/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./openai/gpt-5/bbs/) | 70 | 🟢 | 🟢 | 🟢 | 🟡 | ❌
[`reddit`](./openai/gpt-5/reddit/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌
[`shopping`](./openai/gpt-5/shopping/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌

### `openai/gpt-5` - `todo`

- Source Code: [`openai/gpt-5/todo`](./openai/gpt-5/todo/)
- Score: 100
- Elapsed Time: 1h 8m 24s
- Token Usage: 14.87M
- Function Calling Success Rate: 93.95%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 854.2K | 7m 10s | 100%
🟢 Prisma | `namespaces`: 3, `models`: 4 | 448.4K | 5m 20s | 100%
🟢 Interface | `operations`: 17, `schemas`: 32 | 7.96M | 29m 39s | 87%
🟢 Test | `functions`: 17 | 4.48M | 16m 24s | 100%
🟢 Realize | `functions`: 17 | 1.13M | 9m 48s | 100%


### `openai/gpt-5` - `bbs`

- Source Code: [`openai/gpt-5/bbs`](./openai/gpt-5/bbs/)
- Score: 70
- Elapsed Time: 1h 24m 16s
- Token Usage: 74.64M
- Function Calling Success Rate: 90.41%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 11 | 886.3K | 7m 13s | 95%
🟢 Prisma | `namespaces`: 5, `models`: 24 | 809.1K | 9m 57s | 100%
🟢 Interface | `operations`: 77, `schemas`: 148 | 49.91M | 48m 9s | 84%
🔴 Test | `functions`: 13, `errors`: 1 | 23.04M | 18m 55s | 100%
⚪ Realize |  |  |  | 


### `openai/gpt-5` - `reddit`

- Source Code: [`openai/gpt-5/reddit`](./openai/gpt-5/reddit/)
- Score: 30
- Elapsed Time: 25m 32s
- Token Usage: 4.62M
- Function Calling Success Rate: 100.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 16 | 1.79M | 10m 46s | 100%
🟢 Prisma | `namespaces`: 10, `models`: 83 | 2.83M | 14m 46s | 100%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `openai/gpt-5` - `shopping`

- Source Code: [`openai/gpt-5/shopping`](./openai/gpt-5/shopping/)
- Score: 30
- Elapsed Time: 28m 10s
- Token Usage: 6.51M
- Function Calling Success Rate: 100.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 17 | 2.02M | 9m 28s | 100%
🟢 Prisma | `namespaces`: 13, `models`: 107 | 4.49M | 18m 42s | 100%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `anthropic/claude-haiku-4.5`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./anthropic/claude-haiku-4.5/todo/) | 80 | 🟢 | 🟢 | 🟢 | 🟢 | ❌
[`bbs`](./anthropic/claude-haiku-4.5/bbs/) | 80 | 🟢 | 🟢 | 🟢 | 🟢 | ❌
[`reddit`](./anthropic/claude-haiku-4.5/reddit/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌
[`shopping`](./anthropic/claude-haiku-4.5/shopping/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌

### `anthropic/claude-haiku-4.5` - `todo`

- Source Code: [`anthropic/claude-haiku-4.5/todo`](./anthropic/claude-haiku-4.5/todo/)
- Score: 80
- Elapsed Time: 1h 5m 19s
- Token Usage: 59.94M
- Function Calling Success Rate: 39.61%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 10 | 890.8K | 5m 14s | 100%
🟢 Prisma | `namespaces`: 2, `models`: 6 | 692.5K | 4m 38s | 85%
🟢 Interface | `operations`: 37, `schemas`: 44 | 42.42M | 40m 31s | 30%
🟢 Test | `functions`: 96 | 15.94M | 14m 55s | 46%
⚪ Realize |  |  |  | 


### `anthropic/claude-haiku-4.5` - `bbs`

- Source Code: [`anthropic/claude-haiku-4.5/bbs`](./anthropic/claude-haiku-4.5/bbs/)
- Score: 80
- Elapsed Time: 1h 5m 37s
- Token Usage: 93.39M
- Function Calling Success Rate: 37.83%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 1.08M | 6m 59s | 76%
🟢 Prisma | `namespaces`: 7, `models`: 12 | 1.73M | 5m 54s | 80%
🟢 Interface | `operations`: 64, `schemas`: 79 | 55.35M | 30m 54s | 29%
🟢 Test | `functions`: 188 | 35.24M | 21m 49s | 42%
⚪ Realize |  |  |  | 


### `anthropic/claude-haiku-4.5` - `reddit`

- Source Code: [`anthropic/claude-haiku-4.5/reddit`](./anthropic/claude-haiku-4.5/reddit/)
- Score: 30
- Elapsed Time: 18m 15s
- Token Usage: 3.28M
- Function Calling Success Rate: 73.47%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 12 | 1.82M | 13m 46s | 69%
🟢 Prisma | `namespaces`: 9, `models`: 52 | 1.46M | 4m 29s | 84%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `anthropic/claude-haiku-4.5` - `shopping`

- Source Code: [`anthropic/claude-haiku-4.5/shopping`](./anthropic/claude-haiku-4.5/shopping/)
- Score: 30
- Elapsed Time: 20m 0s
- Token Usage: 3.71M
- Function Calling Success Rate: 77.08%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 1.58M | 14m 31s | 75%
🟢 Prisma | `namespaces`: 11, `models`: 79 | 2.13M | 5m 29s | 81%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `qwen/qwen3-next-80b-a3b-instruct`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3-next-80b-a3b-instruct/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./qwen/qwen3-next-80b-a3b-instruct/bbs/) | 80 | 🟢 | 🟢 | 🟢 | 🟢 | ❌
[`reddit`](./qwen/qwen3-next-80b-a3b-instruct/reddit/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌
[`shopping`](./qwen/qwen3-next-80b-a3b-instruct/shopping/) | 10 | 🟢 | ❌ | ❌ | ❌ | ❌

### `qwen/qwen3-next-80b-a3b-instruct` - `todo`

- Source Code: [`qwen/qwen3-next-80b-a3b-instruct/todo`](./qwen/qwen3-next-80b-a3b-instruct/todo/)
- Score: 100
- Elapsed Time: 1h 8m 53s
- Token Usage: 8.34M
- Function Calling Success Rate: 72.86%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 3 | 111.6K | 32s | 100%
🟢 Prisma | `namespaces`: 2, `models`: 3 | 114.5K | 8m 34s | 29%
🟢 Interface | `operations`: 8, `schemas`: 12 | 3.95M | 45m 3s | 65%
🟢 Test | `functions`: 2 | 2.39M | 7m 31s | 77%
🟢 Realize | `functions`: 8 | 1.78M | 7m 11s | 97%


### `qwen/qwen3-next-80b-a3b-instruct` - `bbs`

- Source Code: [`qwen/qwen3-next-80b-a3b-instruct/bbs`](./qwen/qwen3-next-80b-a3b-instruct/bbs/)
- Score: 80
- Elapsed Time: 1h 3m 52s
- Token Usage: 30.98M
- Function Calling Success Rate: 68.36%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 5 | 206.0K | 51s | 100%
🟢 Prisma | `namespaces`: 7, `models`: 15 | 558.9K | 2m 34s | 94%
🟢 Interface | `operations`: 57, `schemas`: 48 | 18.31M | 33m 58s | 62%
🟢 Test | `functions`: 22 | 11.91M | 26m 29s | 73%
⚪ Realize |  |  |  | 


### `qwen/qwen3-next-80b-a3b-instruct` - `reddit`

- Source Code: [`qwen/qwen3-next-80b-a3b-instruct/reddit`](./qwen/qwen3-next-80b-a3b-instruct/reddit/)
- Score: 30
- Elapsed Time: 13m 16s
- Token Usage: 2.79M
- Function Calling Success Rate: 80.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 10 | 639.6K | 2m 42s | 100%
🟢 Prisma | `namespaces`: 10, `models`: 40 | 2.15M | 10m 33s | 67%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `qwen/qwen3-next-80b-a3b-instruct` - `shopping`

- Source Code: [`qwen/qwen3-next-80b-a3b-instruct/shopping`](./qwen/qwen3-next-80b-a3b-instruct/shopping/)
- Score: 10
- Elapsed Time: 5m 29s
- Token Usage: 576.5K
- Function Calling Success Rate: 87.50%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 10 | 576.5K | 5m 29s | 87%
⚪ Prisma |  |  |  | 
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


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
- Elapsed Time: 1h 43m 24s
- Token Usage: 15.39M
- Function Calling Success Rate: 76.71%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 631.3K | 6m 0s | 92%
🟢 Prisma | `namespaces`: 3, `models`: 4 | 356.7K | 2m 37s | 100%
🟢 Interface | `operations`: 24, `schemas`: 31 | 9.58M | 1h 7m 44s | 66%
🟢 Test | `functions`: 20 | 2.60M | 9m 31s | 84%
🟢 Realize | `functions`: 24 | 2.22M | 17m 29s | 91%


### `deepseek/deepseek-v3.1-terminus-exacto` - `bbs`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/bbs`](./deepseek/deepseek-v3.1-terminus-exacto/bbs/)
- Score: 30
- Elapsed Time: 19m 42s
- Token Usage: 1.79M
- Function Calling Success Rate: 91.11%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 562.7K | 5m 43s | 95%
🟢 Prisma | `namespaces`: 8, `models`: 35 | 1.23M | 13m 59s | 85%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `deepseek/deepseek-v3.1-terminus-exacto` - `reddit`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/reddit`](./deepseek/deepseek-v3.1-terminus-exacto/reddit/)
- Score: 30
- Elapsed Time: 29m 34s
- Token Usage: 2.43M
- Function Calling Success Rate: 85.19%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 11 | 621.7K | 6m 8s | 88%
🟢 Prisma | `namespaces`: 10, `models`: 46 | 1.80M | 23m 26s | 82%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `deepseek/deepseek-v3.1-terminus-exacto` - `shopping`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/shopping`](./deepseek/deepseek-v3.1-terminus-exacto/shopping/)
- Score: 30
- Elapsed Time: 35m 21s
- Token Usage: 2.34M
- Function Calling Success Rate: 79.63%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 651.7K | 7m 34s | 92%
🟢 Prisma | `namespaces`: 9, `models`: 40 | 1.69M | 27m 46s | 68%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `qwen/qwen3-30b-a3b-thinking-2507`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3-30b-a3b-thinking-2507/todo/) | 45 | 🟢 | 🟢 | 🟡 | ❌ | ❌
[`bbs`](./qwen/qwen3-30b-a3b-thinking-2507/bbs/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌
[`reddit`](./qwen/qwen3-30b-a3b-thinking-2507/reddit/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌
[`shopping`](./qwen/qwen3-30b-a3b-thinking-2507/shopping/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌

### `qwen/qwen3-30b-a3b-thinking-2507` - `todo`

- Source Code: [`qwen/qwen3-30b-a3b-thinking-2507/todo`](./qwen/qwen3-30b-a3b-thinking-2507/todo/)
- Score: 45
- Elapsed Time: 1h 17m 21s
- Token Usage: 7.13M
- Function Calling Success Rate: 60.28%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 10 | 461.2K | 9m 6s | 91%
🟢 Prisma | `namespaces`: 1, `models`: 1 | 105.1K | 2m 4s | 100%
🔴 Interface | `operations`: 8, `schemas`: 11 | 6.57M | 1h 6m 10s | 53%
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `qwen/qwen3-30b-a3b-thinking-2507` - `bbs`

- Source Code: [`qwen/qwen3-30b-a3b-thinking-2507/bbs`](./qwen/qwen3-30b-a3b-thinking-2507/bbs/)
- Score: 30
- Elapsed Time: 11m 14s
- Token Usage: 550.8K
- Function Calling Success Rate: 75.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 442.2K | 8m 14s | 75%
🟢 Prisma | `namespaces`: 1, `models`: 2 | 108.6K | 2m 59s | NaN%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `qwen/qwen3-30b-a3b-thinking-2507` - `reddit`

- Source Code: [`qwen/qwen3-30b-a3b-thinking-2507/reddit`](./qwen/qwen3-30b-a3b-thinking-2507/reddit/)
- Score: 30
- Elapsed Time: 17m 7s
- Token Usage: 1.48M
- Function Calling Success Rate: 78.85%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 10 | 479.0K | 8m 30s | 80%
🟢 Prisma | `namespaces`: 9, `models`: 24 | 1.00M | 8m 36s | 76%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `qwen/qwen3-30b-a3b-thinking-2507` - `shopping`

- Source Code: [`qwen/qwen3-30b-a3b-thinking-2507/shopping`](./qwen/qwen3-30b-a3b-thinking-2507/shopping/)
- Score: 30
- Elapsed Time: 43m 40s
- Token Usage: 1.79M
- Function Calling Success Rate: NaN%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 582.5K | 7m 4s | NaN%
🟢 Prisma | `namespaces`: 8, `models`: 37 | 1.21M | 36m 36s | NaN%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `meta-llama/llama-4-maverick`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./meta-llama/llama-4-maverick/todo/) | 30 | 🟢 | 🟢 | ❌ | ❌ | ❌
[`bbs`](./meta-llama/llama-4-maverick/bbs/) | 10 | 🟢 | ❌ | ❌ | ❌ | ❌
[`reddit`](./meta-llama/llama-4-maverick/reddit/) | 10 | 🟢 | ❌ | ❌ | ❌ | ❌
`shopping` | 0 | ❌ | ❌ | ❌ | ❌ | ❌

### `meta-llama/llama-4-maverick` - `todo`

- Source Code: [`meta-llama/llama-4-maverick/todo`](./meta-llama/llama-4-maverick/todo/)
- Score: 30
- Elapsed Time: 2m 7s
- Token Usage: 235.5K
- Function Calling Success Rate: 82.35%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 4 | 134.6K | 11s | 100%
🟢 Prisma | `namespaces`: 3, `models`: 4 | 100.9K | 1m 56s | 62%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `meta-llama/llama-4-maverick` - `bbs`

- Source Code: [`meta-llama/llama-4-maverick/bbs`](./meta-llama/llama-4-maverick/bbs/)
- Score: 10
- Elapsed Time: 25s
- Token Usage: 263.8K
- Function Calling Success Rate: 100.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 8 | 263.8K | 25s | 100%
⚪ Prisma |  |  |  | 
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `meta-llama/llama-4-maverick` - `reddit`

- Source Code: [`meta-llama/llama-4-maverick/reddit`](./meta-llama/llama-4-maverick/reddit/)
- Score: 10
- Elapsed Time: 31s
- Token Usage: 273.1K
- Function Calling Success Rate: 100.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 8 | 273.1K | 31s | 100%
⚪ Prisma |  |  |  | 
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `google/gemini-2.5-pro`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./google/gemini-2.5-pro/todo/) | 10 | 🟢 | ❌ | ❌ | ❌ | ❌
[`bbs`](./google/gemini-2.5-pro/bbs/) | 10 | 🟢 | ❌ | ❌ | ❌ | ❌
[`reddit`](./google/gemini-2.5-pro/reddit/) | 10 | 🟢 | ❌ | ❌ | ❌ | ❌
[`shopping`](./google/gemini-2.5-pro/shopping/) | 10 | 🟢 | ❌ | ❌ | ❌ | ❌

### `google/gemini-2.5-pro` - `todo`

- Source Code: [`google/gemini-2.5-pro/todo`](./google/gemini-2.5-pro/todo/)
- Score: 10
- Elapsed Time: 3m 40s
- Token Usage: 524.1K
- Function Calling Success Rate: 100.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 524.1K | 3m 40s | 100%
⚪ Prisma |  |  |  | 
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `google/gemini-2.5-pro` - `bbs`

- Source Code: [`google/gemini-2.5-pro/bbs`](./google/gemini-2.5-pro/bbs/)
- Score: 10
- Elapsed Time: 3m 46s
- Token Usage: 388.2K
- Function Calling Success Rate: 100.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 8 | 388.2K | 3m 46s | 100%
⚪ Prisma |  |  |  | 
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `google/gemini-2.5-pro` - `reddit`

- Source Code: [`google/gemini-2.5-pro/reddit`](./google/gemini-2.5-pro/reddit/)
- Score: 10
- Elapsed Time: 3m 37s
- Token Usage: 691.6K
- Function Calling Success Rate: 100.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 12 | 691.6K | 3m 37s | 100%
⚪ Prisma |  |  |  | 
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `google/gemini-2.5-pro` - `shopping`

- Source Code: [`google/gemini-2.5-pro/shopping`](./google/gemini-2.5-pro/shopping/)
- Score: 10
- Elapsed Time: 6m 4s
- Token Usage: 975.3K
- Function Calling Success Rate: 93.94%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 15 | 975.3K | 6m 4s | 93%
⚪ Prisma |  |  |  | 
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 