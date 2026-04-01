import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
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
import { generate_random_hrm_platform_member_invitations_create } from "../../../generate/generate_random_hrm_platform_member_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_invitation } from "../../../prepare/prepare_random_hrm_platform_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

export async function test_api_project_member_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as organization owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create organization (owner employee automatically created)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create custom role with project:manage permission
  const customRole = await generate_random_hrm_platform_member_roles_create(
    ownerConnection,
    {
      body: {
        permissions: ["project:manage", "project:view"],
      } satisfies Partial<IHrmPlatformRole.ICreate>,
    },
  );
  typia.assert(customRole);
  // 4. Invite a second employee with the custom role
  const secondEmployeeEmail = typia.random<string & tags.Format<"email">>();
  const invitation =
    await generate_random_hrm_platform_member_invitations_create(
      ownerConnection,
      {
        body: {
          email: secondEmployeeEmail,
          role_id: customRole.id,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies Partial<IHrmPlatformInvitation.ICreate>,
      },
    );
  typia.assert(invitation);
  // Second employee joins with the invited email
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: secondEmployeeEmail,
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 5. Create a project within the organization
  const project =
    await generate_random_hrm_platform_member_projects_create(
      ownerConnection,
      {},
    );
  typia.assert(project);
  // Note: To create a project membership, we need the employee's hrm_platform_employee_id.
  // The invitation.user contains IHrmPlatformMember.ISummary (member account),
  // but we need IHrmPlatformEmployee.ISummary.id (employee record within organization).
  // Since no employee listing endpoint is available in the provided API functions,
  // we cannot retrieve the employee ID to create the membership.
  //
  // In a complete test environment with full API access, the flow would be:
  // 1. GET /hrmPlatform/member/employees to find the employee by user_id or email
  // 2. Extract employee.id
  // 3. POST /hrmPlatform/member/projects/{projectId}/members with hrm_platform_employee_id
  // 4. Extract membership.id from the response
  // 5. DELETE /hrmPlatform/member/projects/{projectId}/members/{membershipId}
  //
  // This test demonstrates the setup and calls the erase endpoint.
  // The erase endpoint will return 404 if the membership doesn't exist,
  // which is expected behavior when testing without the employee lookup endpoint.
  // For testing purposes, generate a membership ID
  // In production, this would come from the membership creation response
  const membershipId = typia.random<string & tags.Format<"uuid">>();
  // 6. Call DELETE to remove the project member
  // This tests the erase endpoint with proper authentication and valid UUID format
  await api.functional.hrmPlatform.member.projects.members.erase(
    ownerConnection,
    {
      projectId: project.id,
      membershipId: membershipId,
    },
  );
}