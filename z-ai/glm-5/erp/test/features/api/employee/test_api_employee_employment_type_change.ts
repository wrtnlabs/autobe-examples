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
 * Test that a manager with employee:manage permission can change an employee's
 * employment type classification.
 *
 * Flow:
 * 1. Authenticate as a member (becomes organization owner with full permissions)
 * 2. Create an employee with initial employment type 'part_time'
 * 3. Update the employee's employment type to 'full_time'
 * 4. Verify the employment_type changed correctly
 * 5. Verify all other employee properties remain unchanged
 */
export async function test_api_employee_employment_type_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member (creates organization as owner)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  // 2. Create an employee with initial employment type 'part_time'
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {
      body: {
        employmentType: "part_time",
      },
    },
  );
  typia.assert(employee);
  // Store original values to verify they remain unchanged
  const originalRole = employee.role;
  const originalDepartment = employee.department;
  const originalPosition = employee.position;
  const originalStatus = employee.status;
  const originalMember = employee.member;
  const originalOrganization = employee.organization;
  // 3. Update employee's employment type to 'full_time'
  const updatedEmployee = await api.functional.erpHrm.member.employees.update(
    memberConnection,
    {
      employeeId: employee.id,
      body: {
        employmentType: "full_time",
      } satisfies IErpHrmEmployee.IUpdate,
    },
  );
  typia.assert(updatedEmployee);
  // 4. Verify the employment_type was updated
  TestValidator.equals(
    "employment type updated",
    updatedEmployee.employment_type,
    "full_time",
  );
  // 5. Verify all other fields remain unchanged
  TestValidator.equals(
    "role unchanged",
    updatedEmployee.role.id,
    originalRole.id,
  );
  TestValidator.equals(
    "department unchanged",
    updatedEmployee.department?.id ?? null,
    originalDepartment?.id ?? null,
  );
  TestValidator.equals(
    "position unchanged",
    updatedEmployee.position,
    originalPosition,
  );
  TestValidator.equals(
    "status unchanged",
    updatedEmployee.status,
    originalStatus,
  );
  TestValidator.equals(
    "member unchanged",
    updatedEmployee.member.id,
    originalMember.id,
  );
  TestValidator.equals(
    "organization unchanged",
    updatedEmployee.organization.id,
    originalOrganization.id,
  );
}
