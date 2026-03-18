import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrms_task(
  input?: DeepPartial<IHrmsTask.ICreate>,
): IHrmsTask.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 10 }),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
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
      input?.estimated_hours ?? typia.random<number & tags.Minimum<0>>(),
    due_date:
      input?.due_date ?? typia.random<string & tags.Format<"date-time">>(),
    billable: input?.billable ?? typia.random<boolean>(),
    hrms_employee_id:
      input?.hrms_employee_id ?? typia.random<string & tags.Format<"uuid">>(),
    hrms_task_id:
      input?.hrms_task_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
