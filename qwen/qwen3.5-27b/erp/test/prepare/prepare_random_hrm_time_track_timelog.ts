import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_track_timelog(
  input?: DeepPartial<IHrmTimeTrackTimelog.ICreate>,
): IHrmTimeTrackTimelog.ICreate {
  const randomDate = RandomGenerator.date(new Date(), -31536000000);
  const dateString = randomDate instanceof Date ? randomDate.toISOString() : randomDate;
  
  return {
    date: input?.date ?? dateString,
    duration_seconds:
      input?.duration_seconds ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    hrm_time_track_project_id:
      input?.hrm_time_track_project_id ??
      typia.random<string & tags.Format<"uuid">>(),
    hrm_time_track_task_id:
      input?.hrm_time_track_task_id ??
      typia.random<(string & tags.Format<"uuid">) | null | undefined>(),
    billable: input?.billable ?? typia.random<boolean>(),
    notes: input?.notes ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}