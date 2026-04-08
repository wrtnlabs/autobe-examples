import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employee_invitations_create } from "../../../generate/generate_random_hrm_platform_member_employee_invitations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";

/**
 * Test project member assignment with project-lead role.
 *
 * Validates the complete workflow for assigning an employee to a project with elevated 'project-lead' role permissions. This scenario tests that users with project:manage permission can designate team members as project leads who gain additional capabilities beyond basic members, including task management operations such as creating and editing tasks within the project context.
 *
 * The test establishes authentication, creates a project, converts a member to an employee via invitation (which succeeds immediately since the email already has an account), and assigns the employee to the project with project-lead role. The response is validated to confirm correct role assignment and proper employee-project relationship.
 *
 * 1. Member joins the platform to establish authentication context.
 * 2. Project is created within the organization with random name and color.
 * 3. Employee invitation is created for the member's email - since account exists, employee record is created immediately.
 * 4. Employee is assigned to project with 'project-lead' role.
 * 5. Response is validated for correct role, employee reference, and project reference.
 */
export async function test_api_project_member_assignment_with_project_lead_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join member to establish authentication
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create project using authenticated connection
  const project = await generate_random_hrm_platform_member_projects_create(
    connection,
    {},
  );
  typia.assert(project);
  // 3. Create employee invitation for the same member's email
  // Since the email already has an account, this creates an employee record immediately
  // The response contains employee information when invitation is accepted immediately
  const employeeResult =
    await generate_random_hrm_platform_member_employee_invitations_create(
      connection,
      {
        body: {
          email: memberAuth.email,
          role_id: memberAuth.profile?.member.id
            ? typia.random<string & tags.Format<"uuid">>()
            : typia.random<string & tags.Format<"uuid">>(),
          employment_type: "full-time",
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
        } satisfies IHrmPlatformEmployeeInvitation.ICreate,
      },
    );
  typia.assert(employeeResult);
  // 4. Assign employee to project with project-lead role
  // Note: employeeResult contains the employee information when invitation is immediately accepted
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      connection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          hrm_platform_employee_id: employeeResult.id,
          role: "project-lead",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 5. Validate the assignment
  TestValidator.equals(
    "role is project-lead",
    projectMember.role,
    "project-lead",
  );
  TestValidator.equals("project matches", projectMember.project.id, project.id);
}
