import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_timelog(
  input?: DeepPartial<IErpHrmTimelog.ICreate> | undefined,
): IErpHrmTimelog.ICreate {
  return {
    project_id:
      input?.project_id ?? typia.random<string & tags.Format<"uuid">>(),
    task_id: input?.task_id !== undefined ? input.task_id : null,
    work_date:
      input?.work_date ?? typia.random<string & tags.Format<"date-time">>(),
    duration_minutes:
      input?.duration_minutes ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
      >(),
    billable: input?.billable ?? false,
    description:
      input?.description !== undefined
        ? input.description
        : RandomGenerator.paragraph({ sentences: 2 }),
  };
}
