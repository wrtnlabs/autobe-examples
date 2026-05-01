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
 * Test that changing an employee's role to the same role they already hold succeeds as a no-op without error.
 *
 * Validates the no-op behavior described in the role change endpoint specification: reassigning the identical role to an employee should complete successfully without error. This ensures the API gracefully handles the case where the requested role matches the employee's current assignment rather than rejecting it as a conflict or returning an unexpected error code.
 *
 * The test also verifies that the employee's role identity remains fully preserved — both the role ID and the role name must remain unchanged after the no-op update. A separate member account is created to guarantee an active employee record, avoiding the ambiguity of pending invitations.
 *
 * 1. Owner authenticates through the member join endpoint.
 * 2. Owner creates a custom role in the organization.
 * 3. A separate member account is created, then invited as an employee with the custom role.
 * 4. Owner calls the role change endpoint with the same role ID the employee already holds.
 * 5. Validates the employee record is returned with the role unchanged.
 */
export async function test_api_employee_role_change_same_role_noop(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create a custom role
  const role = await generate_random_erp_hrm_roles_create(ownerConnection, {});
  typia.assert(role);
  // 3. Create a separate member and add as employee with the role
  const employeeMemberConnection: api.IConnection = { host: connection.host };
  const employeeMember = await authorize_member_join(
    employeeMemberConnection,
    {},
  );
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    { body: { email: employeeMember.email, erp_hrm_role_id: role.id } },
  );
  typia.assert(employee);
  // 4. Change role to the same role (no-op)
  const updatedEmployee =
    await api.functional.erpHrm.member.employees.role.update(ownerConnection, {
      employeeId: employee.id,
      body: {
        erp_hrm_role_id: role.id,
      } satisfies IErpHrmEmployee.IUpdateRole,
    });
  typia.assert(updatedEmployee);
  // 5. Validate role remains unchanged
  TestValidator.equals("role id unchanged", updatedEmployee.role.id, role.id);
  TestValidator.equals(
    "role name unchanged",
    updatedEmployee.role.name,
    role.name,
  );
}
