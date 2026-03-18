import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_tracking_task(
  input?: DeepPartial<IErpHrmTimeTrackingTask.ICreate> | undefined,
): IErpHrmTimeTrackingTask.ICreate {
  return {
    title: input?.title ?? RandomGenerator.name(3),
    description:
      input?.description ??
      (Math.random() < 0.5
        ? RandomGenerator.paragraph({ sentences: 2 })
        : null),
    status:
      input?.status ??
      RandomGenerator.pick(["todo", "in_progress", "done"] as const),
    priority:
      input?.priority ??
      RandomGenerator.pick(["low", "medium", "high"] as const),
    parent_task_id:
      input?.parent_task_id ??
      (Math.random() < 0.5
        ? null
        : typia.random<string & tags.Format<"uuid">>()),
    assigned_employee_id:
      input?.assigned_employee_id ??
      (Math.random() < 0.5
        ? null
        : typia.random<string & tags.Format<"uuid">>()),
    estimated_hours:
      input?.estimated_hours ??
      (Math.random() < 0.3
        ? null
        : typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<200>
          >()),
    due_date:
      input?.due_date ??
      (Math.random() < 0.3
        ? null
        : typia.random<string & tags.Format<"date-time">>()),
  };
}
