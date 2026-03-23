import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";

export async function test_api_project_membership_multi_project_assignment(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test multi-project membership capability.
   * Validates that an employee can simultaneously maintain memberships across multiple projects
   * with independent role designations (member vs project-lead).
   */
  // 1. Authenticate as a member with project management permissions
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      href: "https://example.com/join",
      referrer: "https://example.com/signup",
    },
  });
  typia.assert(managerAuth);
  // 2. Create first project for multi-project membership test
  const project1 = await generate_random_hrm_platform_member_projects_create(
    managerConnection,
    {
      body: {
        name: "Project Alpha - Development",
        description:
          "Main development project for testing multi-project assignments",
        status: "active",
        color_code: "#3498db",
        budget_hours: 500,
      },
    },
  );
  typia.assert(project1);
  // 3. Create second project for multi-project membership test
  const project2 = await generate_random_hrm_platform_member_projects_create(
    managerConnection,
    {
      body: {
        name: "Project Beta - Research",
        description:
          "Research and innovation project for testing role variations",
        status: "active",
        color_code: "#e74c3c",
        budget_hours: 300,
      },
    },
  );
  typia.assert(project2);
  // 4. Create a second member who will act as the employee being assigned to projects
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass456!",
      href: "https://example.com/join",
      referrer: "https://example.com/signup",
    },
  });
  typia.assert(employeeAuth);
  // 5. Create membership assigning the employee to the first project with role 'member'
  const membership1 =
    await generate_random_hrm_platform_member_projects_memberships_create(
      managerConnection,
      {
        params: {
          projectId: project1.id,
        },
        body: {
          employee_id: employeeAuth.id,
          role: "member",
        },
      },
    );
  typia.assert(membership1);
  // 6. Create membership assigning the same employee to the second project with role 'project-lead'
  const membership2 =
    await generate_random_hrm_platform_member_projects_memberships_create(
      managerConnection,
      {
        params: {
          projectId: project2.id,
        },
        body: {
          employee_id: employeeAuth.id,
          role: "project-lead",
        },
      },
    );
  typia.assert(membership2);
  // 7. Verify both memberships are created successfully with distinct IDs
  TestValidator.notEquals(
    "membership IDs are distinct",
    membership1.id,
    membership2.id,
  );
  // 8. Verify the employee can have different roles across different projects
  TestValidator.equals(
    "first membership role is member",
    membership1.role,
    "member",
  );
  TestValidator.equals(
    "second membership role is project-lead",
    membership2.role,
    "project-lead",
  );
  // 9. Verify both memberships reference the same employee
  TestValidator.equals(
    "both memberships reference same employee",
    membership1.employee.id,
    membership2.employee.id,
  );
  TestValidator.equals(
    "employee ID matches authenticated member",
    membership1.employee.id,
    employeeAuth.id,
  );
  // 10. Verify memberships reference correct projects
  TestValidator.equals(
    "first membership references project 1",
    membership1.project.id,
    project1.id,
  );
  TestValidator.equals(
    "second membership references project 2",
    membership2.project.id,
    project2.id,
  );
  // 11. Verify project names are correctly associated
  TestValidator.equals(
    "first membership project name",
    membership1.project.name,
    "Project Alpha - Development",
  );
  TestValidator.equals(
    "second membership project name",
    membership2.project.name,
    "Project Beta - Research",
  );
  // 12. Verify both memberships have valid timestamps
  TestValidator.predicate(
    "first membership has created_at timestamp",
    membership1.created_at !== undefined,
  );
  TestValidator.predicate(
    "second membership has created_at timestamp",
    membership2.created_at !== undefined,
  );
  TestValidator.predicate(
    "first membership has updated_at timestamp",
    membership1.updated_at !== undefined,
  );
  TestValidator.predicate(
    "second membership has updated_at timestamp",
    membership2.updated_at !== undefined,
  );
  // 13. Verify memberships are active (not deleted)
  TestValidator.equals(
    "first membership is active",
    membership1.deleted_at,
    null,
  );
  TestValidator.equals(
    "second membership is active",
    membership2.deleted_at,
    null,
  );
}
