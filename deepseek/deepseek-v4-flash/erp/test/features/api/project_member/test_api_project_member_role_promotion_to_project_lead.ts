import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_invitations_create } from "../../../generate/generate_random_hrm_time_tracking_member_invitations_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { prepare_random_hrm_time_tracking_invitation } from "../../../prepare/prepare_random_hrm_time_tracking_invitation";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";

export async function test_api_project_member_role_promotion_to_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register admin member
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinResponse = await authorize_member_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(adminJoinResponse);
  // Step 2: Create organization - admin becomes Owner
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      adminConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Re-login admin to get fresh auth with employee records
  const adminAuth = await authorize_member_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/login",
      referrer: "https://example.com/login",
    },
  });
  typia.assert(adminAuth);
  // Get the admin's role (Owner) - we'll use its ID for the invitation
  // since it's a valid role within the organization
  const ownerRoleId = adminAuth.employees[0].role.id;
  // Step 4: Register a second member
  const secondConnection: api.IConnection = { host: connection.host };
  const secondMemberPassword = RandomGenerator.alphaNumeric(16);
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberJoinResponse = await authorize_member_join(
    secondConnection,
    {
      body: {
        email: secondMemberEmail,
        password: secondMemberPassword,
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com/",
        ip: "127.0.0.1",
      } satisfies IHrmTimeTrackingMember.IJoin,
    },
  );
  typia.assert(secondMemberJoinResponse);
  // Step 5: Invite second member to the organization
  // Since the email belongs to an existing registered member, the system
  // auto-creates an active employee record with the specified role
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      adminConnection,
      {
        body: {
          email: secondMemberEmail,
          role_id: ownerRoleId,
        },
      },
    );
  typia.assert(invitation);
  // Step 6: Re-login second member to get updated auth with their employee record
  const secondMemberAuth = await authorize_member_login(secondConnection, {
    body: {
      email: secondMemberEmail,
      password: secondMemberPassword,
      href: "https://example.com/login",
      referrer: "https://example.com/login",
    },
  });
  typia.assert(secondMemberAuth);
  // Find the second member's employee record in our organization
  const secondMemberEmployee = secondMemberAuth.employees.find(
    (e) => e.role.organization.id === organization.id,
  )!;
  typia.assert(secondMemberEmployee);
  // Step 7: Create a project (defaults to 'active' status)
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      adminConnection,
      {},
    );
  typia.assert(project);
  // Step 8: Add the second member's employee as a project member with role='member'
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      adminConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: secondMemberEmployee.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // Step 9: Execute the target operation - promote to project-lead
  const updatedMember =
    await api.functional.hrmTimeTracking.member.projects.members.update(
      adminConnection,
      {
        projectId: project.id,
        memberId: projectMember.id,
        body: {
          role: "project-lead",
        } satisfies IHrmTimeTrackingProjectMember.IUpdate,
      },
    );
  typia.assert(updatedMember);
  // Step 10: Verify
  // (a) role updated to 'project-lead'
  TestValidator.equals(
    "role should be project-lead",
    updatedMember.role,
    "project-lead",
  );
  // (b) project reference unchanged
  TestValidator.equals(
    "project should match",
    updatedMember.project.id,
    project.id,
  );
  // (c) employee reference unchanged
  TestValidator.equals(
    "employee should match",
    updatedMember.employee.id,
    secondMemberEmployee.id,
  );
  // (d) id unchanged
  TestValidator.equals(
    "id should remain unchanged",
    updatedMember.id,
    projectMember.id,
  );
  // (e) created_at unchanged
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedMember.created_at,
    projectMember.created_at,
  );
  // (f) updated_at reflects the change and is later than created_at
  TestValidator.predicate(
    "updated_at should be later than created_at",
    () =>
      new Date(updatedMember.updated_at).getTime() >
      new Date(updatedMember.created_at).getTime(),
  );
  // (g) deleted_at should still be null (not soft-deleted)
  TestValidator.predicate(
    "deleted_at should be null",
    () => updatedMember.deleted_at === null,
  );
}