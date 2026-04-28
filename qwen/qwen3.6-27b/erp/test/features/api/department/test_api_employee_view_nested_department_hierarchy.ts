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
 * Tests viewing an employee with nested department hierarchy.
 *
 * Validates the two-level department hierarchy structure when viewing an employee profile. Verifies that an employee assigned to a child department correctly resolves their department, and that the child department's parent reference accurately points to the parent department, confirming the one-level nesting hierarchy is properly maintained.
 *
 * 1. Member joins the organization and authenticates to establish organizational context.
 * 2. A second member joins to be invited as an employee.
 * 3. A custom role is created for employee assignment with appropriate permissions.
 * 4. A parent department is created at the top level.
 * 5. A child department is created nested under the parent department via parent_department_id.
 * 6. The second member is invited as an employee and assigned to the child department.
 * 7. The employee is retrieved by their employee ID.
 * 8. Validates that the employee's department resolves to the child department and the child department's parent_department reference points to the parent department.
 */
export async function test_api_employee_view_nested_department_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a manager member to establish organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: `manager${RandomGenerator.alphabets(6)}@example.com`,
      password: "Password123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorizedMember);
  // Step 2: Create a second member who will be invited as an employee
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorizedEmployee = await authorize_member_join(employeeConnection, {
    body: {
      email: `employee${RandomGenerator.alphabets(6)}@example.com`,
      password: "Password123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorizedEmployee);
  // Step 3: Create a custom role for employee assignment
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: `Test Role ${RandomGenerator.alphabets(6)}`,
        permissionKeys: ["time:manage", "project:view", "employee:view"],
      },
    },
  );
  typia.assert(role);
  // Step 4: Create parent (top-level) department
  const parentDepartment =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(parentDepartment);
  // Step 5: Create child department nested under the parent
  const childDepartment =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          parent_department_id: parentDepartment.id,
        },
      },
    );
  typia.assert(childDepartment);
  // Step 6: Invite the second member as an employee, assigned to the child department
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        memberId: authorizedEmployee.id,
        roleId: role.id,
        employmentType: "full-time",
        departmentId: childDepartment.id,
        position: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(employee);
  // Step 7: Retrieve the employee by their ID
  const retrievedEmployee =
    await api.functional.hrmPlatform.member.employees.at(memberConnection, {
      employeeId: employee.id,
    });
  typia.assert(retrievedEmployee);
  // Step 8: Validate the nested department hierarchy structure
  TestValidator.equals("employee matches", retrievedEmployee.id, employee.id);
  TestValidator.equals(
    "employee department is child department",
    retrievedEmployee.department?.id,
    childDepartment.id,
  );
  TestValidator.equals(
    "child department parent references parent department",
    retrievedEmployee.department?.parentDepartment?.id,
    parentDepartment.id,
  );
}
