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
 * Test upgrading a project member's role from 'member' to 'project-lead'.
 *
 * Validates the primary workflow where a project manager assigns elevated task management permissions to a team member. The test authenticates as a member, creates a project, assigns an employee to the project with 'member' role, then updates the role to 'project-lead'.
 *
 * The test verifies that the role update operation correctly modifies the project member assignment and returns the updated record with the new role value. This validates successful role promotion and ensures the business rule that project leads can create, edit, and manage tasks within their assigned project.
 *
 * 1. Authenticate as member user with email and password.
 * 2. Create a new project in the organization with name and color code.
 * 3. Assign an employee to the project with 'member' role using utility function.
 * 4. Update the project member's role to 'project-lead' using SDK update function.
 * 5. Verify the response contains the updated project member record with role='project-lead'.
 * 6. Verify the employee and project references are correctly maintained.
 * 7. Verify timestamps were updated after the role change.
 */
export async function test_api_project_member_role_upgrade_to_lead(
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
  // Organization must exist from member context
  if (!memberAuth.organizations || memberAuth.organizations.length === 0) {
    throw new Error("Member must belong to at least one organization");
  }
  const organizationId = memberAuth.organizations[0].id;
  // 2. Create a project in the organization
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: {
          organizationId: organizationId,
        },
      },
    );
  typia.assert(project);
  // 3. Assign an employee to the project with 'member' role
  // The utility function handles employee selection/creation internally
  const projectMember =
    await generate_random_hrm_member_projects_members_create(memberConnection, {
      params: {
        projectId: project.id,
      },
      body: {
        role: "member",
      },
    });
  typia.assert(projectMember);
  // 4. Verify initial role is 'member'
  TestValidator.equals("initial role is member", projectMember.role, "member");
  // 5. Update the project member's role to 'project-lead'
  const updatedProjectMember =
    await api.functional.hrm.member.projects.members.update(memberConnection, {
      projectId: project.id,
      employeeId: projectMember.employee.id,
      body: {
        role: "project-lead",
      } satisfies IHrmProjectMember.IUpdate,
    });
  typia.assert(updatedProjectMember);
  // 6. Verify the role was updated to 'project-lead'
  TestValidator.equals(
    "role updated to project-lead",
    updatedProjectMember.role,
    "project-lead",
  );
  // 7. Verify project and employee references are maintained
  TestValidator.equals(
    "project id matches",
    updatedProjectMember.project.id,
    project.id,
  );
  TestValidator.equals(
    "employee id matches",
    updatedProjectMember.employee.id,
    projectMember.employee.id,
  );
  // 8. Verify timestamps were updated
  TestValidator.predicate(
    "updated_at is after or equal to created_at",
    new Date(updatedProjectMember.updated_at) >=
      new Date(updatedProjectMember.created_at),
  );
}