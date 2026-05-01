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
 * Test that attempting to erase an already-erased (soft-deleted) employee returns 404 Not Found.
 *
 * Validates the server's soft-delete semantics for employee records. The first erase call marks the employee as deleted by setting the deleted_at timestamp on the erp_hrm_employees record. The second erase call on the same employee ID must return 404 Not Found because soft-deleted records are excluded from all queries — the employee becomes invisible to subsequent API operations while their historical data (timelogs, timesheets, contracts) is preserved for audit integrity.
 *
 * This test ensures the idempotent-deletion guard works correctly: the endpoint must distinguish between a non-existent employee and a soft-deleted one by rejecting both with 404, preventing any accidental double-processing that could corrupt audit trails.
 *
 * 1. Organization owner registers via member join, creating the organization context.
 * 2. A second member registers — their email will be used to create the employee record.
 * 3. Owner creates a custom role to assign to the target employee.
 * 4. Owner creates an employee record for the second member with the custom role.
 * 5. First erase on the employee succeeds (204 No Content).
 * 6. Second erase on the same employee ID returns 404 Not Found.
 */
export async function test_api_employee_erase_already_erased(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as organization owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Register a second member to serve as the employee target
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {});
  typia.assert(secondMember);
  // 3. Create a custom role for the employee
  const role = await generate_random_erp_hrm_roles_create(ownerConnection, {});
  typia.assert(role);
  // 4. Create employee record for the second member in the owner's organization
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    { body: { email: secondMember.email, erp_hrm_role_id: role.id } },
  );
  typia.assert(employee);
  // 5. First erase — succeeds (204 No Content)
  await api.functional.erpHrm.member.employees.erase(ownerConnection, {
    employeeId: employee.id,
  });
  // 6. Second erase — returns 404 Not Found for already-erased employee
  await TestValidator.httpError(
    "second erase on already-erased employee returns 404",
    404,
    async () => {
      await api.functional.erpHrm.member.employees.erase(ownerConnection, {
        employeeId: employee.id,
      });
    },
  );
}
