import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";

/**
 * Test project membership role promotion from 'member' to 'project-lead'.
 *
 * This test validates that a user with project management permissions can
 * successfully promote an employee from regular member to project-lead role,
 * which grants task management capabilities within the project.
 *
 * Workflow:
 * 1. Authenticate as a new member (automatically has project:manage in own org)
 * 2. Create a project in the organization
 * 3. Create an employee in the organization
 * 4. Assign the employee to the project as 'member'
 * 5. Update the membership to 'project-lead'
 * 6. Verify the role was updated and relationships are correct
 */
export async function test_api_project_membership_role_promotion_to_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member (creator has full permissions in their org)
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create a project using utility function
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create an employee in the organization using utility function
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: authResult.id,
        role_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
        status: "active",
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 4. Create project membership with 'member' role
  const membership =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          hrm_platform_employee_id: employee.id,
          role: "member",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(membership);
  // Verify initial role is 'member'
  TestValidator.equals("initial role", membership.role, "member");
  // 5. Update the membership to 'project-lead' role
  const updatedMembership =
    await api.functional.hrmPlatform.member.projects.members.update(
      memberConnection,
      {
        projectId: project.id,
        membershipId: membership.id,
        body: {
          role: "project-lead",
        } satisfies IHrmPlatformProjectMember.IUpdate,
      },
    );
  typia.assert(updatedMembership);
  // 6. Verify the role was updated to 'project-lead'
  TestValidator.equals("updated role", updatedMembership.role, "project-lead");
  // 7. Verify the updated_at timestamp has changed
  TestValidator.notEquals(
    "updated_at changed",
    membership.updated_at,
    updatedMembership.updated_at,
  );
  // 8. Verify employee and project relationships are correct
  TestValidator.equals(
    "employee id matches",
    updatedMembership.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "project id matches",
    updatedMembership.project.id,
    project.id,
  );
  // Verify employee details are preserved
  TestValidator.equals(
    "employee display name",
    updatedMembership.employee.display_name,
    employee.display_name,
  );
  // Verify project details are preserved
  TestValidator.equals(
    "project name",
    updatedMembership.project.name,
    project.name,
  );
  TestValidator.equals(
    "project color",
    updatedMembership.project.color_code,
    project.color_code,
  );
}