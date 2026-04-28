import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
import { generate_random_hrm_platform_member_departments_create } from "../../../generate/generate_random_hrm_platform_member_departments_create";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test viewing an employee with department and role assignment.
 *
 * Validates the complete employee retrieval workflow including member authentication, role and department setup, employee creation with explicit assignments, and employee profile retrieval via GET endpoint. Ensures that the returned employee record contains complete nested information.
 *
 * Verifies that the returned employee record accurately reflects the assigned department (with full hierarchical details including parent reference), the linked role with description, member contact information, and correct employment classification.
 *
 * 1. Register a new member which creates a default organization and authenticates the session.
 * 2. Create a custom role with employee:manage and employee:view permissions within the organization.
 * 3. Create a department within the organization for departmental grouping.
 * 4. Create an employee record linking the member account, custom role, and department with full-time employment type.
 * 5. Retrieve the employee by their ID using the GET endpoint.
 * 6. Validate that member display name and email match the registered member.
 * 7. Validate that the assigned role name matches the created role.
 * 8. Validate that the assigned department name matches the created department.
 * 9. Validate that employment_type is full-time and status is active.
 */
export async function test_api_employee_view_success_with_department(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to create organization and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a custom role within the organization
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        permissionKeys: ["employee:manage", "employee:view"],
      },
    },
  );
  typia.assert(role);
  // 3. Create a department within the organization
  const department =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {},
    );
  typia.assert(department);
  // 4. Create and invite employee with role and department
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        memberId: authorized.id,
        roleId: role.id,
        departmentId: department.id,
        employmentType: "full-time",
        position: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(employee);
  // 5. Retrieve employee by ID
  const retrieved = await api.functional.hrmPlatform.member.employees.at(
    memberConnection,
    {
      employeeId: employee.id,
    },
  );
  typia.assert(retrieved);
  // 6. Validate member information
  TestValidator.equals(
    "member display name matches",
    retrieved.member.display_name,
    authorized.display_name,
  );
  TestValidator.equals(
    "member email matches",
    retrieved.member.email,
    authorized.email,
  );
  // 7. Validate role assignment
  TestValidator.equals("role name matches", retrieved.role.name, role.name);
  TestValidator.predicate(
    "role is not built-in",
    retrieved.role.builtIn === false,
  );
  // 8. Validate department assignment
  TestValidator.equals(
    "department name matches",
    retrieved.department!.name,
    department.name,
  );
  TestValidator.predicate(
    "department has no parent",
    retrieved.department!.parentDepartment === null,
  );
  // 9. Validate employment type and status
  TestValidator.equals(
    "employment type is full-time",
    retrieved.employment_type,
    "full-time",
  );
  TestValidator.equals("status is active", retrieved.status, "active");
  // 10. Validate position is set
  TestValidator.predicate(
    "position is defined",
    retrieved.position !== null && retrieved.position !== undefined,
  );
}
