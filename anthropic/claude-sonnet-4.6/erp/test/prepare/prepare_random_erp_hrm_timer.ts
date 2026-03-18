import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_timer(
  input?: DeepPartial<IErpHrmTimer.ICreate> | undefined,
): IErpHrmTimer.ICreate {
  return {
    project_id:
      input?.project_id ?? typia.random<string & tags.Format<"uuid">>(),
    task_id: input?.task_id !== undefined ? input.task_id : null,
    description:
      input?.description !== undefined
        ? input.description
        : RandomGenerator.paragraph({ sentences: 2 }),
  };
}
