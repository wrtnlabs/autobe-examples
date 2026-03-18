import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_task(
  input?: DeepPartial<IErpHrmTask.ICreate> | undefined,
): IErpHrmTask.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 1 }),
    description:
      input?.description !== undefined
        ? input.description
        : RandomGenerator.content({ paragraphs: 1 }),
    status:
      input?.status !== undefined
        ? input.status
        : RandomGenerator.pick([
            "open",
            "in-progress",
            "completed",
            "closed",
          ] as const),
    priority:
      input?.priority !== undefined
        ? input.priority
        : RandomGenerator.pick(["low", "medium", "high", "urgent"] as const),
    assignee_id: input?.assignee_id !== undefined ? input.assignee_id : null,
    parent_id: input?.parent_id !== undefined ? input.parent_id : null,
    estimated_hours:
      input?.estimated_hours !== undefined
        ? input.estimated_hours
        : typia.random<
            number &
              tags.Type<"double"> &
              tags.ExclusiveMinimum<0> &
              tags.Maximum<100>
          >(),
    due_date:
      input?.due_date !== undefined
        ? input.due_date
        : typia.random<string & tags.Format<"date-time">>(),
  };
}
