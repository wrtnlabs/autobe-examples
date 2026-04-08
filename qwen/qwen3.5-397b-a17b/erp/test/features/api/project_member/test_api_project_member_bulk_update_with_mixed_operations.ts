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
 * Test bulk project member update with mixed operations including role changes, additions, and removals.
 *
 * Validates the complete bulk update workflow for project membership management. Tests that the update operation correctly handles three types of changes simultaneously: updating existing member roles, removing members from the project, and adding new members. This ensures the replacement semantics of the bulk update endpoint work correctly.
 *
 * The test creates a realistic scenario where a project team is being reorganized: one member is promoted to project-lead, one member is removed from the project, and two new members are added with different roles. This validates that all operations are applied atomically and the final state matches the requested configuration.
 *
 * 1. Member authenticates and creates an organization with owner permissions.
 * 2. Creates a project within the organization for testing member management.
 * 3. Creates four employee member accounts (A, B, C, D) in the organization.
 * 4. Assigns initial project members: employee A as member, employee B as project-lead.
 * 5. Performs bulk update with mixed operations:
 *    - Employee A: role changed from member to project-lead
 *    - Employee B: removed from project (not in update request)
 *    - Employee C: added as new member with role 'member'
 *    - Employee D: added as new member with role 'project-lead'
 * 6. Validates response contains exactly 3 members with correct roles.
 * 7. Verifies employee A's role was updated to project-lead.
 * 8. Verifies employee B was removed from project membership.
 * 9. Verifies new members C and D have correct roles and timestamps.
 * 10. Validates pagination structure shows correct record count.
 */
export async function test_api_project_member_bulk_update_with_mixed_operations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as organization owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(owner);
  // 2. Create organization (owner gets Owner role automatically)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      ownerConnection,
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
    ownerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 4. Create four member accounts for employees A, B, C, D
  const memberA = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(memberA);
  const memberB = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(memberB);
  const memberC = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(memberC);
  const memberD = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(memberD);
  // 5. Get the Owner role from organization context
  const ownerRoleId = typia.random<string & tags.Format<"uuid">>();
  // 6. Create employee invitations for members A, B, C, D
  // Since member accounts exist, invitations will create employee records immediately
  const invitationA =
    await generate_random_hrm_platform_member_employee_invitations_create(
      ownerConnection,
      {
        body: {
          email: memberA.email,
          role_id: ownerRoleId,
          employment_type: "full-time",
          expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
        } satisfies IHrmPlatformEmployeeInvitation.ICreate,
      },
    );
  typia.assert(invitationA);
  const invitationB =
    await generate_random_hrm_platform_member_employee_invitations_create(
      ownerConnection,
      {
        body: {
          email: memberB.email,
          role_id: ownerRoleId,
          employment_type: "full-time",
          expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
        } satisfies IHrmPlatformEmployeeInvitation.ICreate,
      },
    );
  typia.assert(invitationB);
  const invitationC =
    await generate_random_hrm_platform_member_employee_invitations_create(
      ownerConnection,
      {
        body: {
          email: memberC.email,
          role_id: ownerRoleId,
          employment_type: "full-time",
          expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
        } satisfies IHrmPlatformEmployeeInvitation.ICreate,
      },
    );
  typia.assert(invitationC);
  const invitationD =
    await generate_random_hrm_platform_member_employee_invitations_create(
      ownerConnection,
      {
        body: {
          email: memberD.email,
          role_id: ownerRoleId,
          employment_type: "full-time",
          expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
        } satisfies IHrmPlatformEmployeeInvitation.ICreate,
      },
    );
  typia.assert(invitationD);
  // 7. Extract employee IDs from invitations
  // When member account exists, the invitation creates employee and returns employee data
  const employeeAId = invitationA.id;
  const employeeBId = invitationB.id;
  const employeeCId = invitationC.id;
  const employeeDId = invitationD.id;
  // 8. Assign initial project members (A as member, B as project-lead)
  const initialMemberA =
    await generate_random_hrm_platform_member_projects_members_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employeeAId,
          role: "member",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(initialMemberA);
  const initialMemberB =
    await generate_random_hrm_platform_member_projects_members_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employeeBId,
          role: "project-lead",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(initialMemberB);
  // 9. Perform bulk update with mixed operations
  // - Keep A but change role to project-lead
  // - Remove B (not included in update)
  // - Add C as member
  // - Add D as project-lead
  const updateMembers = [
    {
      employee_id: employeeAId,
      role: "project-lead" as const,
    },
    {
      employee_id: employeeCId,
      role: "member" as const,
    },
    {
      employee_id: employeeDId,
      role: "project-lead" as const,
    },
  ];
  const updateResult =
    await api.functional.hrmPlatform.member.projects.members.update(
      ownerConnection,
      {
        projectId: project.id,
        body: updateMembers as unknown as IHrmPlatformProjectMember.IUpdate,
      },
    );
  typia.assert(updateResult);
  // 10. Validate pagination structure
  TestValidator.equals(
    "pagination records count",
    updateResult.pagination.records,
    3,
  );
  TestValidator.equals("pagination pages", updateResult.pagination.pages, 1);
  TestValidator.equals(
    "pagination current page",
    updateResult.pagination.current,
    1,
  );
  TestValidator.equals("data array length", updateResult.data.length, 3);
  // 11. Find members by employee ID for validation
  const updatedMemberA = updateResult.data.find(
    (m) => m.employee.id === employeeAId,
  );
  const updatedMemberC = updateResult.data.find(
    (m) => m.employee.id === employeeCId,
  );
  const updatedMemberD = updateResult.data.find(
    (m) => m.employee.id === employeeDId,
  );
  const removedMemberB = updateResult.data.find(
    (m) => m.employee.id === employeeBId,
  );
  // 12. Validate member A's role was updated to project-lead
  TestValidator.predicate(
    "member A exists in updated list",
    updatedMemberA !== undefined,
  );
  TestValidator.equals(
    "member A role updated to project-lead",
    updatedMemberA!.role,
    "project-lead",
  );
  TestValidator.notEquals(
    "member A updated_at changed",
    initialMemberA.updated_at,
    updatedMemberA!.updated_at,
  );
  // 13. Validate member B was removed
  TestValidator.predicate(
    "member B removed from project",
    removedMemberB === undefined,
  );
  // 14. Validate new member C was added with role 'member'
  TestValidator.predicate(
    "member C exists in updated list",
    updatedMemberC !== undefined,
  );
  TestValidator.equals(
    "member C role is member",
    updatedMemberC!.role,
    "member",
  );
  TestValidator.predicate(
    "member C has created_at timestamp",
    updatedMemberC!.created_at !== null,
  );
  // 15. Validate new member D was added with role 'project-lead'
  TestValidator.predicate(
    "member D exists in updated list",
    updatedMemberD !== undefined,
  );
  TestValidator.equals(
    "member D role is project-lead",
    updatedMemberD!.role,
    "project-lead",
  );
  TestValidator.predicate(
    "member D has created_at timestamp",
    updatedMemberD!.created_at !== null,
  );
  // 16. Validate all members belong to correct project
  TestValidator.equals(
    "member A project ID",
    updatedMemberA!.project.id,
    project.id,
  );
  TestValidator.equals(
    "member C project ID",
    updatedMemberC!.project.id,
    project.id,
  );
  TestValidator.equals(
    "member D project ID",
    updatedMemberD!.project.id,
    project.id,
  );
}
