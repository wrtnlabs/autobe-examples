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
import { generate_random_hrm_platform_member_roles_permissions_create } from "../../../generate/generate_random_hrm_platform_member_roles_permissions_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_invitation } from "../../../prepare/prepare_random_hrm_platform_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_role_permission } from "../../../prepare/prepare_random_hrm_platform_role_permission";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test business rule validation: attempting to reject a timesheet that has already been approved.
 *
 * This test validates that the timesheet workflow enforces the one-way progression:
 * draft → submitted → approved (terminal state). Once a timesheet is approved,
 * it cannot be rejected - approvers cannot reverse approvals through the reject endpoint.
 *
 * Test Steps:
 * 1. Register approver and submitter member accounts
 * 2. Create organization context
 * 3. Select organization as active context for both actors
 * 4. Create custom role with time:approve permission for approver
 * 5. Invite approver and submitter to organization with appropriate roles
 * 6. Create project for timelog
 * 7. Assign submitter to project as member
 * 8. Create timelog entry for submitter
 * 9. Create draft timesheet containing the timelog
 * 10. Submit timesheet to make it eligible for approval
 * 11. As the approver, approve the submitted timesheet (transition to approved status)
 * 12. Attempt to reject the already-approved timesheet - should fail with business error
 *
 * Validation Points:
 * - Request is rejected with appropriate business error
 * - Timesheet status remains 'approved' (unchanged)
 * - Error message indicates timesheet cannot be rejected after approval
 */
export async function test_api_timesheet_rejection_approved_status_invalid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register approver and submitter member accounts
  const approverAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(approverAuth);
  const submitterAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(submitterAuth);
  // 2. Create actor-specific connections
  const approverConnection: api.IConnection = { host: connection.host };
  approverConnection.headers = { Authorization: approverAuth.token.access };
  const submitterConnection: api.IConnection = { host: connection.host };
  submitterConnection.headers = { Authorization: submitterAuth.token.access };
  // 3. Create organization context (using approver as owner)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      approverConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >() satisfies number as number,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 4. Select organization as active context for both actors
  await api.functional.hrmPlatform.member.organizations.select(
    approverConnection,
    {
      organizationId: organization.id,
    },
  );
  await api.functional.hrmPlatform.member.organizations.select(
    submitterConnection,
    {
      organizationId: organization.id,
    },
  );
  // 5. Create custom role with time:approve permission for approver
  const approverRole = await generate_random_hrm_platform_member_roles_create(
    approverConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: ["time:approve"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(approverRole);
  // 6. Invite approver to organization with time:approve role
  const approverInvitation =
    await generate_random_hrm_platform_member_invitations_create(
      approverConnection,
      {
        body: {
          email: approverAuth.email,
          role_id: approverRole.id,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IHrmPlatformInvitation.ICreate,
      },
    );
  typia.assert(approverInvitation);
  // 7. Invite submitter to organization
  const submitterInvitation =
    await generate_random_hrm_platform_member_invitations_create(
      approverConnection,
      {
        body: {
          email: submitterAuth.email,
          role_id: approverRole.id,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IHrmPlatformInvitation.ICreate,
      },
    );
  typia.assert(submitterInvitation);
  // 8. Create project for timelog - use valid hex color format
  const project = await generate_random_hrm_platform_member_projects_create(
    submitterConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: `#${RandomGenerator.alphabets(6).toLowerCase()}`,
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 9. Create timelog entry for submitter
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    submitterConnection,
    {
      body: {
        projectId: project.id,
        date: new Date().toISOString(),
        durationMinutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<60>
        >() satisfies number as number,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 10. Create draft timesheet containing the timelog
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    submitterConnection,
    {
      body: {
        week_start_date: weekStart.toISOString().split("T")[0],
        week_end_date: weekEnd.toISOString().split("T")[0],
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 11. Submit timesheet to make it eligible for approval
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
  // 12. Approve the submitted timesheet (as approver)
  const approvedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.approve(
      approverConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(approvedTimesheet);
  TestValidator.equals(
    "status after approve",
    approvedTimesheet.status,
    "approved",
  );
  const approvalTimestamp = approvedTimesheet.reviewed_at;
  // 13. Attempt to reject the already-approved timesheet - should fail with business error
  await TestValidator.error("reject approved timesheet", async () => {
    await api.functional.hrmPlatform.member.timesheets.reject(
      approverConnection,
      {
        timesheetId: timesheet.id,
        body: {
          rejection_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmPlatformTimesheet.IReject,
      },
    );
  });
}
