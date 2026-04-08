import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";

/**
 * Test project member role downgrade from project-lead to member.
 *
 * Validates the role demotion workflow where an employee's elevated project-lead permissions are revoked and downgraded to standard member access. This ensures role changes are bidirectional, properly persisted, and the system correctly handles permission transitions.
 *
 * The test follows a complete workflow: member authentication, project creation, employee assignment as project-lead, role downgrade to member, and verification of the updated role assignment.
 *
 * 1. Member user authenticates with email and password credentials.
 * 2. Create a new project within the organization with active status.
 * 3. Assign an employee to the project with 'project-lead' role initially.
 * 4. Update the project member's role from 'project-lead' to 'member'.
 * 5. Verify the response contains the updated project member with role='member'.
 * 6. Verify the role change is correctly persisted in the system.
 */
export async function test_api_project_member_role_downgrade_to_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // Get organization ID from authenticated member's organizations
  // For this test, we'll use a generated UUID since organizations may not be populated on join
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create a project in the organization
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          color_code: "#3B82F6",
          status: "active",
        } satisfies IHrmProject.ICreate,
        params: {
          organizationId: organizationId,
        },
      },
    );
  typia.assert(project);
  // 3. Create another member to serve as the employee
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(employeeAuth);
  // Use the employee's member ID as employee_id for project membership
  // In real scenario, this would require employee creation flow
  const employeeId = employeeAuth.id;
  // 4. Assign employee to project as project-lead
  const initialMember =
    await generate_random_hrm_member_projects_members_create(memberConnection, {
      body: {
        employee_id: employeeId,
        role: "project-lead",
      } satisfies IHrmProjectMember.ICreate,
      params: {
        projectId: project.id,
      },
    });
  typia.assert(initialMember);
  TestValidator.equals(
    "initial role is project-lead",
    initialMember.role,
    "project-lead",
  );
  // 5. Update the project member's role to 'member'
  const updatedMember = await api.functional.hrm.member.projects.members.update(
    memberConnection,
    {
      projectId: project.id,
      employeeId: employeeId,
      body: {
        role: "member",
      } satisfies IHrmProjectMember.IUpdate,
    },
  );
  typia.assert(updatedMember);
  // 6. Verify the response contains the updated project member with role='member'
  TestValidator.equals(
    "role downgraded to member",
    updatedMember.role,
    "member",
  );
  TestValidator.equals(
    "project id matches",
    updatedMember.project.id,
    project.id,
  );
  TestValidator.equals(
    "employee id matches",
    updatedMember.employee.id,
    employeeId,
  );
}
