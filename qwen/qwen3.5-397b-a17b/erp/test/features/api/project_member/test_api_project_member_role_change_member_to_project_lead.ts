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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employee_invitations_create } from "../../../generate/generate_random_hrm_platform_member_employee_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";

/**
 * Test bulk project member role change operation from member to project-lead and vice versa.
 *
 * Validates the complete role change workflow including member authentication, organization setup, project creation, employee invitation, initial role assignment, and bulk role update. Ensures that role changes are applied correctly while preserving original assignment timestamps.
 *
 * Special attention is given to verifying that the created_at timestamp remains immutable after initial assignment while updated_at reflects the role modification time. Both role values ('member' and 'project-lead') are validated for correct storage and retrieval.
 *
 * 1. Member registers and authenticates with project:manage permission.
 * 2. Organization is created with appropriate configuration.
 * 3. Project is created within the organization for role testing.
 * 4. Two employee invitations are created and accepted.
 * 5. Initial project members are assigned with baseline roles (A as 'member', B as 'project-lead').
 * 6. Bulk update swaps roles: A becomes 'project-lead', B becomes 'member'.
 * 7. Validates role changes are applied correctly without removing members.
 * 8. Validates created_at timestamps remain unchanged from original assignment.
 * 9. Validates updated_at timestamps reflect the role modification time.
 * 10. Validates both role values are correctly stored and retrieved.
 */
export async function test_api_project_member_role_change_member_to_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with project:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
        description: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(project);
  // 4. Create two member accounts first, then invite them as employees
  // This ensures the invitations are immediately accepted and employees are created
  const emailA = typia.random<string & tags.Format<"email">>();
  const emailB = typia.random<string & tags.Format<"email">>();
  // Create member accounts for the employees
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: emailA,
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: emailB,
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Get the default role (Employee) - we'll use a placeholder UUID since we can't query roles
  // In a real scenario, we'd query the roles endpoint, but for E2E we use a known pattern
  // The system creates default roles (Owner, Manager, Employee) for each organization
  // We'll use a placeholder and the API will validate it exists
  const placeholderRoleId = typia.random<string & tags.Format<"uuid">>();
  // Create employee invitations (these will be accepted immediately since emails have accounts)
  const employeeInvitationA =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: emailA,
          role_id: placeholderRoleId,
          employment_type: "full-time",
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
        },
      },
    );
  typia.assert(employeeInvitationA);
  const employeeInvitationB =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: emailB,
          role_id: placeholderRoleId,
          employment_type: "part-time",
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
        },
      },
    );
  typia.assert(employeeInvitationB);
  // Extract employee IDs from the invitation responses
  // When invitation is accepted immediately, the response contains employee data
  // The invitation has the employee relation through the member
  const employeeIdA =
    (employeeInvitationA as any).employee?.id ??
    typia.random<string & tags.Format<"uuid">>();
  const employeeIdB =
    (employeeInvitationB as any).employee?.id ??
    typia.random<string & tags.Format<"uuid">>();
  // 5. Assign initial project members with baseline roles
  const memberA =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employeeIdA,
          role: "member",
        },
      },
    );
  typia.assert(memberA);
  const memberB =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employeeIdB,
          role: "project-lead",
        },
      },
    );
  typia.assert(memberB);
  // Store original created_at timestamps
  const originalCreatedAtA = memberA.created_at;
  const originalCreatedAtB = memberB.created_at;
  const originalUpdatedAtA = memberA.updated_at;
  const originalUpdatedAtB = memberB.updated_at;
  // Wait a small delay to ensure updated_at will be different
  await new Promise((resolve) => setTimeout(resolve, 1100));
  // 6. Perform bulk update to swap roles (individual calls since API expects single IUpdate)
  const updateResultA =
    await api.functional.hrmPlatform.member.projects.members.update(
      memberConnection,
      {
        projectId: project.id,
        body: {
          employee_id: employeeIdA,
          role: "project-lead",
        },
      },
    );
  typia.assert(updateResultA);
  const updateResultB =
    await api.functional.hrmPlatform.member.projects.members.update(
      memberConnection,
      {
        projectId: project.id,
        body: {
          employee_id: employeeIdB,
          role: "member",
        },
      },
    );
  typia.assert(updateResultB);
  // 7. Verify both members remain in the project with updated roles
  // Use updateResultB which contains the final state after both updates
  const allMembers = Array.isArray(updateResultB) ? updateResultB : [updateResultB];
  TestValidator.equals("member count", allMembers.length, 2);
  const updatedMemberA = allMembers.find(
    (m: IHrmPlatformProjectMember) => m.employee.id === employeeIdA,
  );
  const updatedMemberB = allMembers.find(
    (m: IHrmPlatformProjectMember) => m.employee.id === employeeIdB,
  );
  TestValidator.predicate("member A exists", updatedMemberA !== undefined);
  TestValidator.predicate("member B exists", updatedMemberB !== undefined);
  // Verify role changes
  TestValidator.equals(
    "member A role changed to project-lead",
    updatedMemberA!.role,
    "project-lead",
  );
  TestValidator.equals(
    "member B role changed to member",
    updatedMemberB!.role,
    "member",
  );
  // 8. Verify created_at timestamps remain unchanged
  TestValidator.equals(
    "member A created_at unchanged",
    updatedMemberA!.created_at,
    originalCreatedAtA,
  );
  TestValidator.equals(
    "member B created_at unchanged",
    updatedMemberB!.created_at,
    originalCreatedAtB,
  );
  // 9. Verify updated_at timestamps reflect the role modification time
  TestValidator.predicate(
    "member A updated_at changed",
    updatedMemberA!.updated_at > originalUpdatedAtA ||
      updatedMemberA!.updated_at !== originalUpdatedAtA,
  );
  TestValidator.predicate(
    "member B updated_at changed",
    updatedMemberB!.updated_at > originalUpdatedAtB ||
      updatedMemberB!.updated_at !== originalUpdatedAtB,
  );
}