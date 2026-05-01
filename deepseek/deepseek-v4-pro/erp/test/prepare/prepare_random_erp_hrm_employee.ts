import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ERP HRM employee creation data for E2E testing.
 *
 * Generates a complete IErpHrmEmployee.ICreate with randomized values
 * for all fields. The invitee's email is generated as a valid email
 * format, role and department IDs as UUIDs, employment type randomly
 * selected from the four valid options, and position as a single-word
 * job title.
 *
 * All properties support DeepPartial override via the input parameter,
 * allowing tests to customize specific fields while keeping others
 * randomly generated.
 */
export function prepare_random_erp_hrm_employee(
  input?: DeepPartial<IErpHrmEmployee.ICreate>,
): IErpHrmEmployee.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
    erp_hrm_role_id:
      input?.erp_hrm_role_id ?? typia.random<string & tags.Format<"uuid">>(),
    erp_hrm_department_id:
      input?.erp_hrm_department_id ??
      typia.random<string & tags.Format<"uuid">>(),
    employment_type:
      input?.employment_type ??
      RandomGenerator.pick([
        "full-time",
        "part-time",
        "contractor",
        "intern",
      ] as const),
    position: input?.position ?? RandomGenerator.name(1),
  };
}
