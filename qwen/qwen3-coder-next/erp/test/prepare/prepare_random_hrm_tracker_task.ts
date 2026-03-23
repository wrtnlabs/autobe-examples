import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_tracker_task(
  input?: DeepPartial<IHrmTrackerTask.ICreate>,
): IHrmTrackerTask.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 2 }),
    description:
      input?.description ??
      (Math.random() > 0.3 ? RandomGenerator.content({ paragraphs: 1 }) : null),
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
      (typia.random<number & tags.Type<"double">>() >= 0
        ? typia.random<number & tags.Type<"double"> & tags.Minimum<0>>()
        : null),
    due_date:
      input?.due_date ??
      (Math.random() > 0.2
        ? typia.random<string & tags.Format<"date-time">>()
        : null),
    assigned_employee_id:
      input?.assigned_employee_id ??
      (Math.random() > 0.25
        ? typia.random<string & tags.Format<"uuid">>()
        : null),
    parent_task_id:
      input?.parent_task_id ??
      (Math.random() > 0.3
        ? typia.random<string & tags.Format<"uuid">>()
        : null),
  };
}
