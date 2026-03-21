import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test that rejecting a timesheet with an already approved status fails.
 *
 * Setup: Create admin account and authenticate. Create a project, create a timelog,
 * create a timesheet, add the timelog, and submit the timesheet. Then approve the
 * timesheet using the admin approve endpoint.
 *
 * Test: Attempt to reject the approved timesheet with a rejection reason.
 *
 * Validation: Verify response returns an error indicating the timesheet cannot be
 * rejected because it is not in submitted status (approved timesheets cannot be
 * rejected, only rejected ones can be resubmitted).
 */
export async function test_api_timesheet_rejection_fails_for_approved_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Setup: Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  // 3. Create project for timelog association
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 4. Create timelog entry
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: new Date().toISOString(),
        durationMinutes: 120,
        description: "Test timelog for timesheet rejection",
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 5. Create timesheet for the current week
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const sundayOffset = mondayOffset + 6;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: monday.toISOString(),
        week_end_date: sunday.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // 6. Add timelog to the timesheet
  const updatedTimesheet =
    await api.functional.erpHrm.member.timesheets.timelogs.add(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          erp_hrm_timelog_id: timelog.id,
        } satisfies IErpHrmTimesheetTimelog.IAddRequest,
      },
    );
  typia.assert(updatedTimesheet);
  // 7. Submit the timesheet for approval
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet status should be submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // 8. Approve the timesheet (admin action)
  const approvedTimesheet =
    await api.functional.erpHrm.admin.timesheets.approve(adminConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(approvedTimesheet);
  TestValidator.equals(
    "timesheet status should be approved",
    approvedTimesheet.status,
    "approved",
  );
  // 9. Test: Attempt to reject the approved timesheet
  // This should fail because approved timesheets cannot be rejected
  await TestValidator.error(
    "rejecting approved timesheet should fail",
    async () => {
      await api.functional.erpHrm.admin.timesheets.reject(adminConnection, {
        timesheetId: timesheet.id,
        body: {
          rejectionReason:
            "This should fail because timesheet is already approved",
        } satisfies IErpHrmTimesheet.IReject,
      });
    },
  );
}
