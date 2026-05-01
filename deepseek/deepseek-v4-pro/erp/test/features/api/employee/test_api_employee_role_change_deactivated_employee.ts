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
 * Test that a deactivated employee's role can still be changed by an owner.
 *
 * Validates that deactivation does not prevent administrative role reassignment. The specification states that even when an employee's status is "deactivated", role changes should still be allowed — deactivation suspends the employee's ability to log time and submit timesheets but does not block administrative operations.
 *
 * The test verifies that after role change the employee record reflects the new role assignment while preserving the deactivated status. It also confirms the role actually changed by comparing against the original role assignment.
 *
 * 1. Owner authenticates via member join with random credentials.
 * 2. Owner creates the first custom role for initial employee assignment.
 * 3. Owner invites an employee assigned to the first role.
 * 4. Owner deactivates the employee, confirming status becomes "deactivated".
 * 5. Owner creates a second custom role as the reassignment target.
 * 6. Owner changes the deactivated employee's role from the first role to the second role.
 * 7. Validates the updated employee: status stayed "deactivated", role changed to second role, role differs from original.
 */
export async function test_api_employee_role_change_deactivated_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create first role
  const firstRole = await generate_random_erp_hrm_roles_create(
    ownerConnection,
    {},
  );
  typia.assert(firstRole);
  // 3. Create employee with first role
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    { body: { erp_hrm_role_id: firstRole.id } },
  );
  typia.assert(employee);
  // 4. Deactivate the employee
  const deactivated = await api.functional.erpHrm.member.employees.deactivate(
    ownerConnection,
    { employeeId: employee.id },
  );
  typia.assert(deactivated);
  TestValidator.equals(
    "employee status is deactivated",
    deactivated.status,
    "deactivated",
  );
  // 5. Create second role
  const secondRole = await generate_random_erp_hrm_roles_create(
    ownerConnection,
    {},
  );
  typia.assert(secondRole);
  TestValidator.notEquals(
    "second role differs from first role",
    secondRole.id,
    firstRole.id,
  );
  // 6. Change role of deactivated employee
  const updated = await api.functional.erpHrm.member.employees.role.update(
    ownerConnection,
    {
      employeeId: employee.id,
      body: {
        erp_hrm_role_id: secondRole.id,
      } satisfies IErpHrmEmployee.IUpdateRole,
    },
  );
  typia.assert(updated);
  // 7. Validate
  TestValidator.equals("employee id unchanged", updated.id, employee.id);
  TestValidator.equals(
    "status remains deactivated after role change",
    updated.status,
    "deactivated",
  );
  TestValidator.equals(
    "role changed to second role",
    updated.role.id,
    secondRole.id,
  );
  TestValidator.notEquals(
    "role no longer references first role",
    updated.role.id,
    firstRole.id,
  );
}
