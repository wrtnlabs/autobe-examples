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

export async function test_api_project_member_assignment_as_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization owner (first member)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(ownerAuth);
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
        },
      },
    );
  typia.assert(organization);
  // 3. Create custom role with project:manage permission
  const customRole = await generate_random_hrm_platform_member_roles_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: ["project:manage"],
      },
    },
  );
  typia.assert(customRole);
  // 4. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#3498db",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 5. Create second user account first (they will become employee when invited)
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUserAuth = await authorize_member_join(secondUserConnection, {
    body: {
      email: secondUserEmail,
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(secondUserAuth);
  // 6. Invite second user to organization (creates employee record immediately since user exists)
  const invitation =
    await generate_random_hrm_platform_member_invitations_create(
      ownerConnection,
      {
        body: {
          email: secondUserEmail,
          role_id: customRole.id,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  typia.assert(invitation);
  // 7. Get employee ID from the invitation's user field (member ID)
  // Note: In a real scenario, you would query the employee list to get the employee ID
  // For this test, we use the member ID as the employee record would be linked
  const employeeId = invitation.user!.id;
  // 8. Assign employee to project with 'member' role using owner connection
  // (owner has org:manage permission through default Owner role)
  const membership =
    await generate_random_hrm_platform_member_projects_members_create(
      ownerConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          hrm_platform_employee_id: employeeId,
          role: "member",
        },
      },
    );
  typia.assert(membership);
  // 9. Validate membership response
  TestValidator.equals("role is member", membership.role, "member");
  TestValidator.equals(
    "employee id matches",
    membership.employee.id,
    employeeId,
  );
  TestValidator.equals("project id matches", membership.project.id, project.id);
  TestValidator.predicate(
    "created_at is populated",
    membership.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is populated",
    membership.updated_at !== null,
  );
  TestValidator.predicate("deleted_at is null", membership.deleted_at === null);
  TestValidator.predicate("employee has user", membership.employee.user !== null);
  TestValidator.predicate("employee has role", membership.employee.role !== null);
  TestValidator.equals(
    "project has name",
    membership.project.name,
    project.name,
  );
  TestValidator.equals("project status", membership.project.status, "active");
}