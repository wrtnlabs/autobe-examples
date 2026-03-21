import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_timelog(
  input?: DeepPartial<IErpHrmTimelog.ICreate>,
): IErpHrmTimelog.ICreate {
  return {
    projectId: input?.projectId ?? typia.random<string & tags.Format<"uuid">>(),
    taskId:
      input?.taskId ??
      RandomGenerator.pick([
        null,
        typia.random<string & tags.Format<"uuid">>(),
      ] as const) ??
      null,
    date: input?.date ?? new Date().toISOString(),
    durationMinutes:
      input?.durationMinutes ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    billable: input?.billable ?? RandomGenerator.pick([true, false] as const),
  };
}
