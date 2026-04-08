import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_employee(
  input?: DeepPartial<IErpHrmEmployee.ICreate>,
): IErpHrmEmployee.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
    roleId: input?.roleId ?? typia.random<string & tags.Format<"uuid">>(),
    departmentId:
      input?.departmentId ?? typia.random<string & tags.Format<"uuid">>(),
    position: input?.position ?? RandomGenerator.paragraph({ sentences: 1 }),
    employmentType:
      input?.employmentType ??
      RandomGenerator.pick([
        "full-time",
        "part-time",
        "contractor",
        "intern",
      ] as const),
  };
}
