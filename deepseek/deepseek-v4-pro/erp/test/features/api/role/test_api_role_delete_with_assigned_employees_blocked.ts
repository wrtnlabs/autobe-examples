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
 * Test that deleting a custom role assigned to employees is blocked.
 *
 * Validates that the role deletion endpoint rejects requests when active employees in the organization are currently assigned to the target role. The system must return an HTTP error response indicating that employees must be reassigned before the role can be deleted.
 *
 * 1. Organization Owner authenticates via join to establish the organization context.
 * 2. A custom role is created with randomized permissions.
 * 3. An employee is created in the organization.
 * 4. The custom role is assigned to the employee, establishing the blocking condition.
 * 5. Deleting the custom role is attempted and expected to fail with an error.
 */
export async function test_api_role_delete_with_assigned_employees_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner authenticates
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create a custom role
  const customRole = await generate_random_erp_hrm_roles_create(
    ownerConnection,
    {},
  );
  typia.assert(customRole);
  // 3. Create an employee
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {},
  );
  typia.assert(employee);
  // 4. Assign the custom role to the employee
  const updatedEmployee =
    await api.functional.erpHrm.member.employees.role.update(ownerConnection, {
      employeeId: employee.id,
      body: {
        erp_hrm_role_id: customRole.id,
      } satisfies IErpHrmEmployee.IUpdateRole,
    });
  typia.assert(updatedEmployee);
  // 5. Attempt to delete the role — must be blocked
  await TestValidator.error(
    "delete role with assigned employees blocked",
    async () => {
      await api.functional.erpHrm.roles.erase(ownerConnection, {
        roleId: customRole.id,
      });
    },
  );
}
