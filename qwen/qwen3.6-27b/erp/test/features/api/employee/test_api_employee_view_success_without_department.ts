import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test viewing an employee record that was created without a department assignment.
 *
 * Validates that the employee detail endpoint correctly returns all employee fields when the employee has no department assigned. Confirms that the optional department LEFT JOIN returns null for the department field, verifying nullable constraints are properly handled.
 *
 * The test covers member authentication, role creation, employee invitation without department, and employee retrieval. Special attention is given to verifying that the department field is explicitly null (not undefined or missing) when no department is assigned.
 *
 * 1. Admin member joins the platform, creating a default organization.
 * 2. Admin creates a custom role with permissions.
 * 3. Second member joins the platform.
 * 4. Admin invites second member as employee with part-time employment type and intentionally omits department assignment.
 * 5. Admin retrieves the employee by ID.
 * 6. Validates that department is null, employment type is part-time, and all other fields are populated correctly.
 */
export async function test_api_employee_view_success_without_department(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin member joins to establish organization context
  const adminConnection: api.IConnection = { host: connection.host };
  const adminMember = await authorize_member_join(adminConnection, {});
  typia.assert(adminMember);
  // 2. Create a custom role to assign to the employee
  const role = await generate_random_hrm_platform_member_roles_create(
    adminConnection,
    { body: {} },
  );
  typia.assert(role);
  // 3. Create second member to be invited as employee
  const employeeMemberConnection: api.IConnection = { host: connection.host };
  const employeeMember = await authorize_member_join(
    employeeMemberConnection,
    {},
  );
  typia.assert(employeeMember);
  // 4. Create employee without departmentId, with part-time employment type
  const employee = await generate_random_hrm_platform_member_employees_create(
    adminConnection,
    {
      body: {
        memberId: employeeMember.id,
        roleId: role.id,
        employmentType: "part-time",
      },
    },
  );
  typia.assert(employee);
  // 5. Retrieve employee by ID using SDK function
  const retrievedEmployee =
    await api.functional.hrmPlatform.member.employees.at(adminConnection, {
      employeeId: employee.id,
    });
  typia.assert(retrievedEmployee);
  // 6. Validate department is null, employment type is part-time, and fields are populated
  TestValidator.equals(
    "department is null",
    retrievedEmployee.department,
    null,
  );
  TestValidator.equals(
    "employment type is part-time",
    retrievedEmployee.employment_type,
    "part-time",
  );
  TestValidator.equals(
    "employee ID matches",
    retrievedEmployee.id,
    employee.id,
  );
  TestValidator.equals(
    "member email matches",
    retrievedEmployee.member.email,
    employeeMember.email,
  );
  TestValidator.equals("role ID matches", retrievedEmployee.role.id, role.id);
  TestValidator.equals("status is active", retrievedEmployee.status, "active");
}
