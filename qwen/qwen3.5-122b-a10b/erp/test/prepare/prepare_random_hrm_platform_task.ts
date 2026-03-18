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
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 2 }),
    description:
      input?.description ??
      (Math.random() > 0.5 ? RandomGenerator.content({ paragraphs: 1 }) : null),
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
      (Math.random() > 0.7
        ? null
        : typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<168>
          >()),
    due_date:
      input?.due_date ??
      (Math.random() > 0.5
        ? null
        : typia.random<string & tags.Format<"date-time">>()),
    parent_task_id:
      input?.parent_task_id ??
      (Math.random() > 0.7
        ? null
        : typia.random<string & tags.Format<"uuid">>()),
    assigned_employee_id:
      input?.assigned_employee_id ??
      (Math.random() > 0.5
        ? null
        : typia.random<string & tags.Format<"uuid">>()),
  };
}
