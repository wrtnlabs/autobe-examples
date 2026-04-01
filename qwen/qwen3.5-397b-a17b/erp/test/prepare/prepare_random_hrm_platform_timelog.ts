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
    date: input?.date ?? typia.random<string & tags.Format<"date-time">>(),
    durationMinutes:
      input?.durationMinutes ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    projectId: input?.projectId ?? typia.random<string & tags.Format<"uuid">>(),
    taskId:
      input?.taskId ??
      (Math.random() < 0.5
        ? typia.random<string & tags.Format<"uuid">>()
        : null),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    billable: input?.billable ?? true,
  };
}
