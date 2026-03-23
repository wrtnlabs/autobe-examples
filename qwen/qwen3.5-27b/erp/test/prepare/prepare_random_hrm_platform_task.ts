import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_platform_task(
  input?: DeepPartial<IHrmPlatformTask.ICreate>,
): IHrmPlatformTask.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 5 }),
    status:
      input?.status ??
      RandomGenerator.pick([
        "todo",
        "in_progress",
        "in_review",
        "done",
      ] as const),
    priority:
      input?.priority ??
      RandomGenerator.pick(["low", "medium", "high", "urgent"] as const),
    due_date:
      input?.due_date ?? typia.random<string & tags.Format<"date-time">>(),
    estimated_hours:
      input?.estimated_hours ??
      typia.random<number & tags.Minimum<0.5> & tags.Maximum<160>>(),
    assigned_employee_id:
      input?.assigned_employee_id ??
      typia.random<string & tags.Format<"uuid">>(),
    parent_task_id:
      input?.parent_task_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
