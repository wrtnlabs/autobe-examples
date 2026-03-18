import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_timelog(
  input?: DeepPartial<IHrmTimeTrackingTimelog.ICreate>,
): IHrmTimeTrackingTimelog.ICreate {
  return {
    hrmTimeTrackingProjectId:
      input?.hrmTimeTrackingProjectId ??
      typia.random<string & tags.Format<"uuid">>(),
    hrmTimeTrackingTaskId:
      input?.hrmTimeTrackingTaskId !== undefined
        ? input.hrmTimeTrackingTaskId
        : typia.random<string & tags.Format<"uuid">>(),
    workedOn:
      input?.workedOn ?? typia.random<string & tags.Format<"date-time">>(),
    durationMinutes:
      input?.durationMinutes ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    description:
      input?.description !== undefined
        ? input.description
        : RandomGenerator.paragraph({ sentences: 3 }),
    billable: input?.billable ?? RandomGenerator.pick([true, false] as const),
  };
}
