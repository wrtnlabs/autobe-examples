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

/**
 * Test project member role demotion from project-lead to member.
 *
 * This test validates the reverse role change scenario where a project-lead
 * is demoted back to a regular member role. The test verifies:
 * 1. Organization, project, and employee setup with project-lead role
 * 2. Role update from 'project-lead' to 'member'
 * 3. Response validation showing role change
 * 4. Timestamp validation (updated_at changes, created_at remains)
 */
export async function test_api_project_member_role_demotion_to_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate organization owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "OwnerPassword123!",
      display_name: RandomGenerator.name(),
      href: "",
      referrer: "",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(ownerAuthorized);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create custom role with project:manage permission
  const role = await generate_random_hrm_platform_member_roles_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: ["project:manage", "employee:manage"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(role);
  // 4. Create employee member account first (will be invited to org)
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuthorized = await authorize_member_join(employeeConnection, {
    body: {
      email: employeeEmail,
      password: "EmployeePassword123!",
      display_name: RandomGenerator.name(),
      href: "",
      referrer: "",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employeeAuthorized);
  // 5. Invite employee to organization (creates employee record since user exists)
  const invitation =
    await generate_random_hrm_platform_member_invitations_create(
      ownerConnection,
      {
        body: {
          email: employeeEmail,
          role_id: role.id,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IHrmPlatformInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // 6. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 7. Get employee ID from invitation (user exists, so employee was created)
  // The invitation response includes the user reference after acceptance
  const employeeId = invitation.user!.id;
  // 8. Create project membership with project-lead role
  const membership =
    await generate_random_hrm_platform_member_projects_members_create(
      ownerConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          hrm_platform_employee_id: employeeId,
          role: "project-lead",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(membership);
  // Store original timestamps and role
  const originalCreatedAt = membership.created_at;
  const originalUpdatedAt = membership.updated_at;
  const originalRole = membership.role;
  // Validate initial role is project-lead
  TestValidator.equals(
    "initial role is project-lead",
    originalRole,
    "project-lead",
  );
  // 9. Demote from project-lead to member
  const updatedMembership =
    await api.functional.hrmPlatform.member.projects.members.update(
      ownerConnection,
      {
        projectId: project.id,
        membershipId: membership.id,
        body: {
          role: "member",
        } satisfies IHrmPlatformProjectMember.IUpdate,
      },
    );
  typia.assert(updatedMembership);
  // 10. Validate role change
  TestValidator.equals(
    "role changed to member",
    updatedMembership.role,
    "member",
  );
  TestValidator.notEquals(
    "role was changed",
    originalRole,
    updatedMembership.role,
  );
  // 11. Validate timestamps
  TestValidator.equals(
    "created_at unchanged",
    updatedMembership.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at modified",
    updatedMembership.updated_at,
    originalUpdatedAt,
  );
  // 12. Validate employee and project references unchanged
  TestValidator.equals(
    "employee unchanged",
    updatedMembership.employee.id,
    membership.employee.id,
  );
  TestValidator.equals(
    "project unchanged",
    updatedMembership.project.id,
    membership.project.id,
  );
}