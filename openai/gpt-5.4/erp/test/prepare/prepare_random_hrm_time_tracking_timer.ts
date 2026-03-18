import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_timer(
  input?: DeepPartial<IHrmTimeTrackingTimer.ICreate>,
): IHrmTimeTrackingTimer.ICreate {
  return {
    hrm_time_tracking_project_id:
      input?.hrm_time_tracking_project_id ??
      typia.random<string & tags.Format<"uuid">>(),
    hrm_time_tracking_task_id:
      input?.hrm_time_tracking_task_id !== undefined
        ? input.hrm_time_tracking_task_id
        : RandomGenerator.pick([true, false] as const)
          ? typia.random<string & tags.Format<"uuid">>()
          : null,
    description:
      input?.description !== undefined
        ? input.description
        : RandomGenerator.pick([true, false] as const)
          ? RandomGenerator.paragraph({ sentences: 4 })
          : null,
  };
}
