import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_task_history(
  input?: DeepPartial<IHrmTimeTrackingTaskHistory.ICreate>,
): IHrmTimeTrackingTaskHistory.ICreate {
  return {
    new_status:
      input?.new_status ??
      RandomGenerator.pick([
        "pending",
        "in_progress",
        "blocked",
        "completed",
        "cancelled",
        "review",
        "approved",
        "rejected",
      ] as const),
  };
}
