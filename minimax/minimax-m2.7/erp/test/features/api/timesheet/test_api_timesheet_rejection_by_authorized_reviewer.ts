import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_rejection_by_authorized_reviewer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member (who becomes employee with time:approve permission)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a project for timelog association
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#3F51B5" as string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 3. Create timelogs for the member/employee
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: new Date().toISOString(),
        durationMinutes: 120,
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: new Date().toISOString(),
        durationMinutes: 180,
      },
    },
  );
  typia.assert(timelog2);
  // 4. Create a draft timesheet for the employee (week starting Monday)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 1 : -(dayOfWeek - 1);
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
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
  // 5. Add timelogs to the draft timesheet
  const timesheetWithTimelog1 =
    await api.functional.erpHrm.member.timesheets.timelogs.add(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          erp_hrm_timelog_id: timelog1.id,
        },
      },
    );
  typia.assert(timesheetWithTimelog1);
  const timesheetWithTimelogs =
    await api.functional.erpHrm.member.timesheets.timelogs.add(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          erp_hrm_timelog_id: timelog2.id,
        },
      },
    );
  typia.assert(timesheetWithTimelogs);
  // 6. Submit the timesheet for approval
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  // Verify timesheet is in submitted status before rejection
  TestValidator.equals(
    "timesheet status is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // 7. Reject the timesheet with a reason
  const rejectionReason =
    "Please correct the hours for Monday - you logged 8 hours but should have logged 7.5 hours for the meeting time.";
  const rejectedTimesheet =
    await api.functional.erpHrm.member.timesheets.reject(memberConnection, {
      timesheetId: timesheet.id,
      body: {
        rejectionReason: rejectionReason,
      },
    });
  typia.assert(rejectedTimesheet);
  // 8. Validate the rejection response
  TestValidator.equals(
    "timesheet status is rejected",
    rejectedTimesheet.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches input",
    rejectedTimesheet.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewed_at timestamp is set",
    rejectedTimesheet.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewer employee is set",
    rejectedTimesheet.reviewerEmployee !== null,
  );
}
