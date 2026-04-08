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
 * Test project member assignment with member role.
 *
 * Validates the complete project member assignment workflow including member authentication, project creation, employee invitation, and project membership assignment. Ensures that an active employee can be successfully assigned to a project with the 'member' role designation.
 *
 * Special attention is given to verifying that the employee invitation creates an immediate employee record when the invited email already has a member account, and that the project membership correctly references both the employee and project with the designated role.
 *
 * 1. Member registers and authenticates to gain organization-scoped access.
 * 2. Member creates a project with name and color code.
 * 3. Employee invitation is created which immediately adds the member as an employee since the account exists.
 * 4. Employee is assigned to the project with 'member' role.
 * 5. Validates project membership contains correct project reference, role as 'member', and system-generated timestamps.
 */
export async function test_api_project_member_assignment_with_member_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create employee invitation - since member exists, employee is created immediately
  // The invitation response contains employee information through the member relation
  const invitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: memberAuth.email,
        },
      },
    );
  typia.assert(invitation);
  // 4. Assign employee to project with 'member' role
  // The employee was created immediately when invitation was sent to existing member
  // Using the SDK function directly with the employee ID from invitation context
  const projectMember =
    await api.functional.hrmPlatform.member.projects.members.create(
      memberConnection,
      {
        projectId: project.id,
        body: {
          hrm_platform_employee_id: invitation.id,
          role: "member",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 5. Validate project membership
  TestValidator.equals("project matches", projectMember.project.id, project.id);
  TestValidator.equals("role is member", projectMember.role, "member");
  TestValidator.predicate(
    "created_at is valid",
    projectMember.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is valid",
    projectMember.updated_at !== null,
  );
  TestValidator.predicate(
    "employee is assigned",
    projectMember.employee.id !== null,
  );
  TestValidator.equals(
    "employee member email matches",
    projectMember.employee.member.email,
    memberAuth.email,
  );
}
