import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_timer(
  input?: DeepPartial<IErpHrmTimeTimer.ICreate> | undefined,
): IErpHrmTimeTimer.ICreate {
  return {
    project_id:
      input?.project_id ?? typia.random<string & tags.Format<"uuid">>(),
    task_id:
      input?.task_id === undefined
        ? typia.random<string & tags.Format<"uuid">>()
        : input.task_id === null
          ? null
          : input.task_id,
    description:
      input?.description === undefined
        ? RandomGenerator.paragraph({ sentences: 1 })
        : input.description === null
          ? null
          : input.description,
  };
}
