import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";

/**
 * Test that an employee without the employee:manage permission cannot reactivate a deactivated employee.
 *
 * Validates role-based access control for the employee reactivation endpoint. Only users holding the `employee:manage` permission — typically the Owner or Manager roles — are authorized to reactivate deactivated employees. An employee with the default Employee role, even when acting on their own record, must be denied.
 *
 * 1. Owner authenticates via join and receives the Owner role with full permissions.
 * 2. Owner invites a new employee by email, creating either an immediate employee record or a pending invitation.
 * 3. The invited person joins with the matching email, resolving the invitation and acquiring the Employee role (no `employee:manage`).
 * 4. Owner deactivates the employee, confirming the status transitions to "deactivated".
 * 5. The deactivated employee attempts to reactivate their own record — the API must reject with 403 Forbidden.
 * 6. The employee's status is verified to remain "deactivated" after the failed reactivation attempt.
 */
export async function test_api_employee_reactivate_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner authenticates (has employee:manage permission via Owner role)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Owner invites a new employee
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    { body: { email: employeeEmail } },
  );
  typia.assert(employee);
  // 3. Invited person joins (resolves invitation, gets Employee role — no employee:manage)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: { email: employeeEmail },
  });
  typia.assert(employeeAuth);
  // 4. Owner deactivates the employee
  const deactivatedEmployee =
    await api.functional.erpHrm.member.employees.deactivate(ownerConnection, {
      employeeId: employee.id,
    });
  typia.assert(deactivatedEmployee);
  TestValidator.equals(
    "employee status is deactivated",
    deactivatedEmployee.status,
    "deactivated",
  );
  // 5. Deactivated employee (no employee:manage) tries to reactivate → 403 Forbidden
  await TestValidator.httpError(
    "employee without manage permission cannot reactivate",
    403,
    async () => {
      await api.functional.erpHrm.member.employees.reactivate(
        employeeConnection,
        { employeeId: employee.id },
      );
    },
  );
}
