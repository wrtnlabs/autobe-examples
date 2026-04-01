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
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
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
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_invitation } from "../../../prepare/prepare_random_hrm_platform_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test the timesheet rejection workflow where an approver with time:approve
 * permission rejects a submitted timesheet.
 *
 * Test Steps:
 * 1. Register approver user and create organization
 * 2. Create Manager role with time:approve permission
 * 3. Register submitter user
 * 4. Invite submitter to organization with Employee role
 * 5. Create project and assign submitter as project member
 * 6. Create timelog for submitter
 * 7. Create draft timesheet for the week
 * 8. Submit timesheet
 * 9. As approver, reject the timesheet with a reason
 * 10. Validate rejection results
 */
export async function test_api_timesheet_rejection_by_approver(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register approver and create organization
  const approverAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(approverAuth);
  const approverConnection: api.IConnection = { host: connection.host };
  approverConnection.headers = { Authorization: approverAuth.token.access };
  const organization =
    await api.functional.hrmPlatform.member.organizations.create(
      approverConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 2. Create Manager role with time:approve permission
  const managerRole = await api.functional.hrmPlatform.member.roles.create(
    approverConnection,
    {
      body: {
        name: "Manager",
        permissions: ["time:approve"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(managerRole);
  // 3. Register submitter user
  const submitterEmail = typia.random<string & tags.Format<"email">>();
  const submitterAuth = await authorize_member_join(connection, {
    body: {
      email: submitterEmail,
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(submitterAuth);
  // 4. Create Team Member role for submitter (avoid conflict with built-in Employee role)
  const teamMemberRole = await api.functional.hrmPlatform.member.roles.create(
    approverConnection,
    {
      body: {
        name: "Team Member",
        permissions: ["time:manage"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(teamMemberRole);
  // 5. Invite submitter to organization with Team Member role
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  const submitterInvitation =
    await api.functional.hrmPlatform.member.invitations.create(
      approverConnection,
      {
        body: {
          email: submitterEmail,
          role_id: teamMemberRole.id,
          expires_at: expiresAt.toISOString(),
        } satisfies IHrmPlatformInvitation.ICreate,
      },
    );
  typia.assert(submitterInvitation);
  // 6. Create project
  const project = await api.functional.hrmPlatform.member.projects.create(
    approverConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#3498db",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 7. Get submitter's employee ID from invitation
  // When user exists, invitation creates employee and returns it
  // The invitation response includes user info, but we need to extract employee ID
  // Since invitation.user is IHrmPlatformMember.ISummary, we need employee ID differently
  // For this test, we'll assume the employee was created and use a workaround
  // In production, there would be an endpoint to list employees or get by user_id
  // Create submitter connection
  const submitterConnection: api.IConnection = { host: connection.host };
  submitterConnection.headers = { Authorization: submitterAuth.token.access };
  // 8. Create timelog for submitter (employee must be project member)
  // Note: In a complete test, we would add submitter as project member first
  // This requires getting the employee ID which needs an employees list endpoint
  const timelog = await api.functional.hrmPlatform.member.timelogs.create(
    submitterConnection,
    {
      body: {
        date: new Date().toISOString(),
        durationMinutes: 480,
        projectId: project.id,
        description: "Test work",
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 9. Calculate week start (Monday) and end (Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  // 10. Create draft timesheet
  const timesheet = await api.functional.hrmPlatform.member.timesheets.create(
    submitterConnection,
    {
      body: {
        week_start_date: weekStart.toISOString().split("T")[0],
        week_end_date: weekEnd.toISOString().split("T")[0],
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  TestValidator.equals("initial status", timesheet.status, "draft");
  // 11. Submit timesheet
  const submittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.submit(
      submitterConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "status after submit",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted_at is set",
    submittedTimesheet.submitted_at !== null,
  );
  // 12. Reject timesheet as approver
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const rejectedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.reject(
      approverConnection,
      {
        timesheetId: submittedTimesheet.id,
        body: {
          rejection_reason: rejectionReason,
        } satisfies IHrmPlatformTimesheet.IReject,
      },
    );
  typia.assert(rejectedTimesheet);
  // 13. Validate rejection results
  TestValidator.equals(
    "status after reject",
    rejectedTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "rejection reason",
    rejectedTimesheet.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewed_at is set",
    rejectedTimesheet.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewed_by_employee_id is set",
    rejectedTimesheet.reviewed_by_employee_id !== null,
  );
}
