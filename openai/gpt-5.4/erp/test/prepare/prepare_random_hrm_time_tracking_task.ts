import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_task(
  input?: DeepPartial<IHrmTimeTrackingTask.ICreate>,
): IHrmTimeTrackingTask.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    description:
      input?.description !== undefined
        ? input.description
        : RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 8,
          }),
    status:
      input?.status ??
      RandomGenerator.pick([
        "open",
        "in-progress",
        "completed",
        "closed",
      ] as const),
    priority:
      input?.priority ??
      RandomGenerator.pick(["low", "medium", "high", "urgent"] as const),
    estimated_hours:
      input?.estimated_hours !== undefined
        ? input.estimated_hours
        : typia.random<number & tags.Type<"double">>(),
    due_date:
      input?.due_date !== undefined
        ? input.due_date
        : typia.random<string & tags.Format<"date-time">>(),
    hrm_time_tracking_employee_id:
      input?.hrm_time_tracking_employee_id !== undefined
        ? input.hrm_time_tracking_employee_id
        : typia.random<string & tags.Format<"uuid">>(),
    parent_id:
      input?.parent_id !== undefined
        ? input.parent_id
        : typia.random<string & tags.Format<"uuid">>(),
  };
}
