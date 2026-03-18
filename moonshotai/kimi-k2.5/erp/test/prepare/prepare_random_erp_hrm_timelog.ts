import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_timelog(
  input?: DeepPartial<IErpHrmTimelog.ICreate>,
): IErpHrmTimelog.ICreate {
  const startTime =
    input?.start_time ??
    RandomGenerator.date(
      new Date(Date.now() - 1000 * 60 * 60 * 24),
      1000 * 60 * 60 * 24,
    ).toISOString();
  return {
    project_id:
      input?.project_id ?? typia.random<string & tags.Format<"uuid">>(),
    task_id: input?.task_id ?? null,
    start_time: startTime,
    end_time:
      input?.end_time ??
      new Date(
        new Date(startTime).getTime() +
          1000 *
            60 *
            60 *
            typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<8>
            >(),
      ).toISOString(),
    billable: input?.billable ?? false,
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
