import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_platform_timelog(
  input?: DeepPartial<IHrmPlatformTimelog.ICreate>,
): IHrmPlatformTimelog.ICreate {
  return {
    project_id:
      input?.project_id ?? typia.random<string & tags.Format<"uuid">>(),
    task_id: input?.task_id ?? typia.random<string & tags.Format<"uuid">>(),
    date: input?.date ?? typia.random<string & tags.Format<"date-time">>(),
    duration:
      input?.duration ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1440>
      >(),
    billable: input?.billable ?? true,
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
