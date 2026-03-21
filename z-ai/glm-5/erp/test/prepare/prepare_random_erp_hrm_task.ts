import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_task(
  input?: DeepPartial<IErpHrmTask.ICreate>,
): IErpHrmTask.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 2 }),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 2 }),
    employee_id:
      input?.employee_id ?? typia.random<string & tags.Format<"uuid">>(),
    parent_task_id:
      input?.parent_task_id ?? typia.random<string & tags.Format<"uuid">>(),
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
      input?.estimated_hours ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
    due_date:
      input?.due_date ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
