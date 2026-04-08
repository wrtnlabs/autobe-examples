import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_task_history_entry(
  input?: DeepPartial<IErpHrmTimeTaskHistoryEntry.ICreate> | undefined,
): IErpHrmTimeTaskHistoryEntry.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 2 }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 3,
        sentenceMax: 6,
      }),
    status: input?.status ?? "open",
    priority:
      input?.priority ??
      RandomGenerator.pick(["low", "medium", "high", "urgent"] as const),
    estimatedHours:
      input?.estimatedHours ??
      typia.random<number & tags.Type<"double"> & tags.ExclusiveMinimum<0>>(),
    dueDate:
      input?.dueDate ?? typia.random<string & tags.Format<"date-time">>(),
    employeeId:
      input?.employeeId ?? typia.random<string & tags.Format<"uuid">>(),
    parentTaskId:
      input?.parentTaskId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
