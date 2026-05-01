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
import { generate_random_erp_hrm_member_departments_create } from "../../../generate/generate_random_erp_hrm_member_departments_create";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

/**
 * Test that deactivating an already-deactivated employee is idempotent.
 *
 * Validates the explicitly documented edge case that updating an
 * already-deactivated employee's status to deactivated succeeds without error
 * and returns the employee record with status unchanged. This ensures the API
 * handles repeated deactivation requests gracefully, preserving historical data
 * while preventing redundant state transitions from causing errors.
 *
 * 1. A member joins the platform, creating an organization and receiving the
 *    Owner role with all permissions including employee:manage.
 * 2. A custom role is created for employee assignment.
 * 3. A department is created for organizational placement.
 * 4. An active employee is created with the custom role and department, and
 *    the initial status is verified as "active".
 * 5. The employee is deactivated via the update endpoint — status changes to
 *    "deactivated".
 * 6. The same employee is deactivated again — the idempotent operation succeeds
 *    without error and the status remains "deactivated".
 */
export async function test_api_employee_deactivation_idempotent(
  connection: api.IConnection,
) {
  // 1. Join as member (creates organization, becomes Owner)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create custom role
  const role = await generate_random_erp_hrm_roles_create(memberConnection, {});
  typia.assert(role);
  // 3. Create department
  const department = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    {},
  );
  typia.assert(department);
  // 4. Create active employee
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {
      body: {
        erp_hrm_role_id: role.id,
        erp_hrm_department_id: department.id,
      },
    },
  );
  typia.assert(employee);
  TestValidator.equals(
    "employee is active initially",
    employee.status,
    "active",
  );
  // 5. First deactivation
  const deactivated1 = await api.functional.erpHrm.member.employees.update(
    memberConnection,
    {
      employeeId: employee.id,
      body: {
        status: "deactivated",
      } satisfies IErpHrmEmployee.IUpdate,
    },
  );
  typia.assert(deactivated1);
  TestValidator.equals(
    "first deactivation changes status",
    deactivated1.status,
    "deactivated",
  );
  // 6. Second deactivation (idempotent)
  const deactivated2 = await api.functional.erpHrm.member.employees.update(
    memberConnection,
    {
      employeeId: employee.id,
      body: {
        status: "deactivated",
      } satisfies IErpHrmEmployee.IUpdate,
    },
  );
  typia.assert(deactivated2);
  TestValidator.equals(
    "second deactivation is idempotent",
    deactivated2.status,
    "deactivated",
  );
}
