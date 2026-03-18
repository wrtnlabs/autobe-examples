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
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 1 }),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
    status:
      input?.status ??
      RandomGenerator.pick([
        "Open",
        "In-Progress",
        "Completed",
        "Closed",
      ] as const),
    priority:
      input?.priority ??
      RandomGenerator.pick(["Low", "Medium", "High", "Critical"] as const),
    due_date:
      input?.due_date ?? typia.random<string & tags.Format<"date-time">>(),
    estimated_hours:
      input?.estimated_hours ??
      typia.random<number & tags.Minimum<0> & tags.Maximum<100>>(),
    assigned_to_id:
      input?.assigned_to_id ?? typia.random<string & tags.Format<"uuid">>(),
    parent_task_id: input?.parent_task_id ?? null,
  };
}
