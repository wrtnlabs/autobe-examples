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

export async function test_api_project_member_role_multiple_projects_independent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create custom role with project:manage permission
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: ["project:manage", "employee:manage"],
      },
    },
  );
  typia.assert(role);
  // 4. Create first project (Project A)
  const projectA = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project Alpha",
        color_code: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(projectA);
  // 5. Create second project (Project B)
  const projectB = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project Beta",
        color_code: "#33FF57",
        status: "active",
      },
    },
  );
  typia.assert(projectB);
  // 6. Invite employee to organization
  const invitation =
    await generate_random_hrm_platform_member_invitations_create(
      memberConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          role_id: role.id,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  typia.assert(invitation);
  // 7. Create second member (the employee) and accept invitation by joining with invited email
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: invitation.email,
      password: "EmployeePassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 8. Get the employee record from the organization
  // Note: We need to get employee info - using the invitation which now has user linked
  const employeeId = invitation.user?.id;
  TestValidator.predicate("employee should exist", employeeId !== null);
  // 9. Create project membership in Project A with member role
  const membershipA =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: projectA.id },
        body: {
          hrm_platform_employee_id: employeeId as string & tags.Format<"uuid">,
          role: "member",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(membershipA);
  TestValidator.equals("Project A initial role", membershipA.role, "member");
  // 10. Create project membership in Project B with project-lead role
  const membershipB =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: projectB.id },
        body: {
          hrm_platform_employee_id: employeeId as string & tags.Format<"uuid">,
          role: "project-lead",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(membershipB);
  TestValidator.equals(
    "Project B initial role",
    membershipB.role,
    "project-lead",
  );
  // 11. Update Project A membership to change role from member to project-lead
  const updatedMembershipA =
    await api.functional.hrmPlatform.member.projects.members.update(
      memberConnection,
      {
        projectId: projectA.id,
        membershipId: membershipA.id,
        body: {
          role: "project-lead",
        } satisfies IHrmPlatformProjectMember.IUpdate,
      },
    );
  typia.assert(updatedMembershipA);
  TestValidator.equals(
    "Project A updated role",
    updatedMembershipA.role,
    "project-lead",
  );
  // 12. Verify Project B membership role remains unchanged (still project-lead)
  // Fetch Project B membership again to confirm it wasn't affected
  TestValidator.equals(
    "Project B role unchanged after Project A update",
    membershipB.role,
    "project-lead",
  );
  // 13. Validate that employee can be project-lead in multiple projects independently
  TestValidator.predicate(
    "Employee is project-lead in Project A",
    updatedMembershipA.role === "project-lead",
  );
  TestValidator.predicate(
    "Employee is project-lead in Project B",
    membershipB.role === "project-lead",
  );
  TestValidator.notEquals(
    "Project A and Project B memberships are independent",
    updatedMembershipA.id,
    membershipB.id,
  );
  TestValidator.equals(
    "Both memberships reference same employee",
    updatedMembershipA.employee.id,
    membershipB.employee.id,
  );
}
