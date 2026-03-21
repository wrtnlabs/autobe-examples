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
    project_id:
      input?.project_id ?? typia.random<string & tags.Format<"uuid">>(),
    task_id: input?.task_id ?? null,
    date: input?.date ?? typia.random<string & tags.Format<"date-time">>(),
    duration:
      input?.duration ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    description: input?.description ?? null,
    billable: input?.billable ?? undefined,
  };
}
