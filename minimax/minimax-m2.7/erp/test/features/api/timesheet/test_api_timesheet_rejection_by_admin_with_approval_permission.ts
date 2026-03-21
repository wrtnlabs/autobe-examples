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

export async function test_api_timesheet_rejection_by_admin_with_approval_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 3. Create a project to associate the timelog with
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color: "#3A7AFE" as string & typia.tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 4. Create timelog entry to be added to the timesheet
  // Calculate Monday-Sunday for current week
  const today = new Date("2026-03-20T05:08:56.722Z");
  const dayOfWeek = today.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - daysToMonday);
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(0, 0, 0, 0);
  const weekStartDate = monday.toISOString();
  const weekEndDate = sunday.toISOString();
  // Create timelog date within the week (e.g., Wednesday)
  const timelogDate = new Date(monday);
  timelogDate.setUTCDate(monday.getUTCDate() + 2);
  timelogDate.setUTCHours(10, 0, 0, 0);
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: timelogDate.toISOString(),
        durationMinutes: 480,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 5. Create draft timesheet for the work week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
      },
    },
  );
  typia.assert(timesheet);
  // 6. Add timelog to the draft timesheet
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
  // Verify timesheet is submitted before rejection
  TestValidator.equals(
    "timesheet status is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // 8. Test: Send POST request to reject the submitted timesheet with a valid rejection reason
  const rejectionReason = "Hours need verification for Monday";
  const rejectedTimesheet = await api.functional.erpHrm.admin.timesheets.reject(
    adminConnection,
    {
      timesheetId: timesheet.id,
      body: {
        rejectionReason: rejectionReason,
      } satisfies IErpHrmTimesheet.IReject,
    },
  );
  typia.assert(rejectedTimesheet);
  // 9. Validation: Verify response returns 200 with correct timesheet data
  TestValidator.equals(
    "timesheet status changed to rejected",
    rejectedTimesheet.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection_reason contains the provided reason",
    rejectedTimesheet.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewed_at timestamp is set",
    rejectedTimesheet.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewerEmployee is set",
    rejectedTimesheet.reviewerEmployee !== null,
  );
  TestValidator.equals(
    "timesheet is rejected",
    rejectedTimesheet.status,
    "rejected",
  );
}
