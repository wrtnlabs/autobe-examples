import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_timelog(
  input?: DeepPartial<IErpHrmTimeTimelog.ICreate> | undefined,
): IErpHrmTimeTimelog.ICreate {
  return {
    workDate:
      input?.workDate ?? typia.random<string & tags.Format<"date-time">>(),
    durationMinutes:
      input?.durationMinutes ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    projectId: input?.projectId ?? typia.random<string & tags.Format<"uuid">>(),
    taskId: input?.taskId ?? null,
    description:
      input?.description === undefined
        ? RandomGenerator.paragraph({ sentences: 2 })
        : input.description,
    billable: input?.billable ?? true,
  };
}
