import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

/**
 * Test that an organization owner with employee:manage permission can successfully erase a non-owner employee, and that all business side effects are correctly applied.
 *
 * Validates the employee erasure workflow end-to-end: owner authentication through member join, custom role creation, employee creation with the custom role, and the erase operation itself. The erasure is a soft-delete that permanently removes the employee from organizational views while preserving historical data for audit integrity.
 *
 * 1. Owner authenticates via member join — creates the member account, organization, and auto-assigns the Owner role with full permissions including employee:manage.
 * 2. Owner creates a custom role (non-Owner) for the target employee, ensuring the target is not the sole Owner and erasure is permitted.
 * 3. Owner creates an employee record with the custom role — the target employee is active and ready for erasure.
 * 4. Owner executes the erase operation on the target employee's ID — the response is void (204 No Content), confirming successful erasure.
 * 5. Verifies that a subsequent erase attempt on the same employee fails — the record is no longer accessible after soft-deletion.
 */
export async function test_api_employee_erase_success(
  connection: api.IConnection,
) {
  // 1. Authenticate as organization owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create a custom role for the target employee
  const customRole = await generate_random_erp_hrm_roles_create(
    ownerConnection,
    {},
  );
  typia.assert(customRole);
  // 3. Create the employee record
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        erp_hrm_role_id: customRole.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Erase the employee
  await api.functional.erpHrm.member.employees.erase(ownerConnection, {
    employeeId: employee.id,
  });
  // 5. Verify the employee is no longer accessible
  await TestValidator.error(
    "erased employee not found on re-erase",
    async () => {
      await api.functional.erpHrm.member.employees.erase(ownerConnection, {
        employeeId: employee.id,
      });
    },
  );
}
