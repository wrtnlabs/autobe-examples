import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_task(
  input?: DeepPartial<IHrmTimeTrackingTask.ICreate> | undefined,
): IHrmTimeTrackingTask.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    status: input?.status ?? "todo",
    priority:
      input?.priority ??
      RandomGenerator.pick(["low", "medium", "high", "urgent"] as const),
    estimatedHours: input?.estimatedHours ?? null,
    dueDate:
      input?.dueDate ?? typia.random<string & tags.Format<"date-time">>(),
    assignedEmployeeId: input?.assignedEmployeeId ?? null,
    parentTaskId: input?.parentTaskId ?? null,
  };
}
