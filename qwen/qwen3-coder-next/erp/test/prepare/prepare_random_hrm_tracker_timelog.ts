import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_tracker_timelog(
  input?: DeepPartial<IHrmTrackerTimelog.ICreate>,
): IHrmTrackerTimelog.ICreate {
  return {
    date: input?.date ?? typia.random<string & tags.Format<"date-time">>(),
    duration_in_minutes:
      input?.duration_in_minutes ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    project_id:
      input?.project_id ?? typia.random<string & tags.Format<"uuid">>(),
    task_id: input?.task_id ?? typia.random<string & tags.Format<"uuid">>(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    billable: input?.billable ?? true,
  };
}
