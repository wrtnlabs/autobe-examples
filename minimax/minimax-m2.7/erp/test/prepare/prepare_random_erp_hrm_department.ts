import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_department(
  input?: DeepPartial<IErpHrmDepartment.ICreate>,
): IErpHrmDepartment.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(2),
    description:
      input?.description === null
        ? null
        : (input?.description ?? RandomGenerator.paragraph({ sentences: 2 })),
    parent_id:
      input?.parent_id === null
        ? null
        : (input?.parent_id ?? typia.random<string & tags.Format<"uuid">>()),
  };
}
