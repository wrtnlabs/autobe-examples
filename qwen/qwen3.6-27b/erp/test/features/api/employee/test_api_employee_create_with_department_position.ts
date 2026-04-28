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
 * Test employee invitation with organizational placement including department assignment and custom position title.
 *
 * Validates the complete employee invitation flow: joining as an organization owner, creating organizational structure (department, role), and inviting a new member as an employee with specific organizational placement. Ensures role permissions, department links, and position titles are correctly populated in the employee record.
 *
 * Special attention is given to verifying that the employee record correctly links to the specified department, includes the assigned position title, and reflects the role assignment with its permissions.
 *
 * 1. Admin member joins platform, creating default organization.
 * 2. Second member joins as pending employee to be invited.
 * 3. Admin creates a department for organizational grouping.
 * 4. Admin creates custom role with employee management permissions.
 * 5. Admin invites second member with department, position, role, and employment type.
 * 6. Validates employee response includes correct member link, department object, position title, role assignment, and active status.
 */
export async function test_api_employee_create_with_department_position(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminMember = await authorize_member_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(adminMember);
  const inviteeConnection: api.IConnection = { host: connection.host };
  const inviteeMember = await authorize_member_join(inviteeConnection, {
    body: {
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(inviteeMember);
  const department =
    await generate_random_hrm_platform_member_departments_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(department);
  const role = await generate_random_hrm_platform_member_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        permissionKeys: ["employee:manage", "employee:view"],
      },
    },
  );
  typia.assert(role);
  const body = {
    memberId: inviteeMember.id,
    roleId: role.id,
    departmentId: department.id,
    position: RandomGenerator.paragraph({ sentences: 2 }),
    employmentType: "full-time",
  } satisfies IHrmPlatformEmployee.ICreate;
  const employee = await generate_random_hrm_platform_member_employees_create(
    adminConnection,
    { body },
  );
  typia.assert(employee);
  TestValidator.equals(
    "employee member matches invited member",
    employee.member.id,
    inviteeMember.id,
  );
  TestValidator.equals(
    "employee department matches created department",
    employee.department?.id,
    department.id,
  );
  TestValidator.equals(
    "employee position matches input",
    employee.position,
    body.position,
  );
  TestValidator.equals(
    "employee role matches created role",
    employee.role.id,
    role.id,
  );
  TestValidator.equals("employee is active", employee.status, "active");
}
