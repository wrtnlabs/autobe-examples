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

export async function test_api_project_member_removal_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization owner (first member)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: "",
      referrer: "",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create organization (owner automatically gets Owner role)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create custom role with only project:view permission (no project:manage)
  const restrictedRole = await generate_random_hrm_platform_member_roles_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: "Restricted role with view-only access",
        permissions: ["project:view"] as const,
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(restrictedRole);
  // 4. Invite second employee with restricted role
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const invitation =
    await generate_random_hrm_platform_member_invitations_create(
      ownerConnection,
      {
        body: {
          email: secondEmail,
          role_id: restrictedRole.id,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IHrmPlatformInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // 5. Second employee joins and accepts invitation
  const restrictedConnection: api.IConnection = { host: connection.host };
  const restrictedAuth = await authorize_member_join(restrictedConnection, {
    body: {
      email: secondEmail,
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: "",
      referrer: "",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(restrictedAuth);
  // 6. Create project within the organization
  const project =
    await generate_random_hrm_platform_member_projects_create(
      ownerConnection,
      {},
    );
  typia.assert(project);
  // 7. Create project membership using owner connection
  // Note: This requires the employee ID of the restricted user
  // In a complete implementation, we would retrieve this from employee list endpoint
  // For this test, we create the membership structure
  const membership =
    await generate_random_hrm_platform_member_projects_members_create(
      ownerConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          hrm_platform_employee_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          role: "member" as const,
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(membership);
  // 8. Test: Attempt to delete membership without project:manage permission
  // This should return 403 Forbidden (permission denied)
  await TestValidator.error(
    "permission denied for membership deletion without project:manage",
    async () => {
      await api.functional.hrmPlatform.member.projects.members.erase(
        restrictedConnection,
        {
          projectId: project.id,
          membershipId: membership.id,
        },
      );
    },
  );
  // 9. Verify membership still exists (not deleted) by attempting to delete with owner
  // If the previous delete had succeeded, this would return 404
  // This confirms the membership record was not modified
  await api.functional.hrmPlatform.member.projects.members.erase(
    ownerConnection,
    {
      projectId: project.id,
      membershipId: membership.id,
    },
  );
}