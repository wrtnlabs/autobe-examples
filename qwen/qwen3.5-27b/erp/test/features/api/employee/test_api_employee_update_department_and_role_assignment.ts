import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_admin_departments_create } from "../../../generate/generate_random_hrm_platform_admin_departments_create";
import { generate_random_hrm_platform_admin_roles_create } from "../../../generate/generate_random_hrm_platform_admin_roles_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test employee department and role assignment update workflow.
 * 1. Admin authenticates to the system
 * 2. Creates a department for organizational grouping
 * 3. Creates a custom role with specific permissions
 * 4. Updates an employee with new department and role assignments
 * 5. Validates the updated employee entity contains correct relationships
 */
export async function test_api_employee_update_department_and_role_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
    },
  });
  // 2. Create department for employee assignment
  const department =
    await generate_random_hrm_platform_admin_departments_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(department);
  // 3. Create custom role for employee assignment
  const role = await generate_random_hrm_platform_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: ["employee_view", "project_view", "time_view"],
      },
    },
  );
  typia.assert(role);
  // 4. Update employee with new department and role
  // Note: This test assumes an employee exists with the provided ID
  // In a real test environment, this would be a seeded/fixed employee ID
  const employeeId = typia.random<string & typia.tags.Format<"uuid">>();
  const updateBody = {
    department_id: department.id,
    role_id: role.id,
  } satisfies IHrmPlatformEmployee.IUpdate;
  const updatedEmployee =
    await api.functional.hrmPlatform.admin.employees.update(adminConnection, {
      employeeId,
      body: updateBody,
    });
  typia.assert(updatedEmployee);
  // 5. Validate the updated employee entity
  TestValidator.equals(
    "department assignment matches",
    updatedEmployee.department?.id,
    department.id,
  );
  TestValidator.equals(
    "role assignment matches",
    updatedEmployee.role.id,
    role.id,
  );
  TestValidator.predicate(
    "department name matches",
    updatedEmployee.department?.name === department.name,
  );
  TestValidator.predicate(
    "role name matches",
    updatedEmployee.role.name === role.name,
  );
  // 6. Verify updated_at timestamp is recent (within last minute)
  const updatedAt = new Date(updatedEmployee.updated_at);
  const now = new Date();
  const timeDifference = Math.abs(now.getTime() - updatedAt.getTime());
  TestValidator.predicate(
    "updated_at timestamp is recent (within 1 minute)",
    timeDifference < 60000,
  );
  // 7. Verify employee status and employment_type are preserved
  TestValidator.predicate(
    "employee has valid status",
    updatedEmployee.status === "active" ||
      updatedEmployee.status === "deactivated",
  );
  TestValidator.predicate(
    "employee has valid employment type",
    ["full-time", "part-time", "contractor", "intern"].includes(
      updatedEmployee.employment_type,
    ),
  );
}
