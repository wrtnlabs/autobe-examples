import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_department(
  input?: DeepPartial<IErpHrmTimeDepartment.ICreate> | undefined,
): IErpHrmTimeDepartment.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(2),
    description:
      input?.description === undefined
        ? RandomGenerator.paragraph({ sentences: 2 })
        : input.description,
    parentDepartmentId:
      input?.parentDepartmentId === undefined
        ? typia.random<string & tags.Format<"uuid">>()
        : input.parentDepartmentId,
  };
}
