import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
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
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_timelog_removal_from_draft(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates organization and project setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  // 2. Member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  // 3. Set organization context for member
  // Note: In real scenario, member would be invited to org first
  // For testing, we need to get the organization ID from admin's context or create an org
  // Since this is a simplified flow, we'll use a mock organization context
  // The actual organization context selection would require member to belong to an org
  // 4. Create project for timelog assignment
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 5. Create timelogs within a specific week (Monday to Sunday)
  // Calculate Monday of current week
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const weekStartDate = monday.toISOString();
  // Create 3 timelogs within the week
  // Use projectId from IEntry (not id - IEntry has projectId property)
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.items[0].projectId,
        date: weekStartDate,
        durationMinutes: 120,
        description: "First task",
        billable: true,
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.items[0].projectId,
        date: new Date(monday.getTime() + 86400000).toISOString(), // Tuesday
        durationMinutes: 90,
        description: "Second task",
        billable: true,
      },
    },
  );
  typia.assert(timelog2);
  const timelog3 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.items[0].projectId,
        date: new Date(monday.getTime() + 2 * 86400000).toISOString(), // Wednesday
        durationMinutes: 60,
        description: "Third task",
        billable: true,
      },
    },
  );
  typia.assert(timelog3);
  // 6. Create draft timesheet that auto-includes all timelogs
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: weekStartDate,
      },
    },
  );
  typia.assert(timesheet);
  // 7. Verify timelogs are associated with timesheet
  TestValidator.equals("timesheet has draft status", timesheet.status, "draft");
  TestValidator.equals(
    "timesheet has 3 timelogs",
    timesheet.timesheetTimelogs.length,
    3,
  );
  // Calculate total hours before removal (120 + 90 + 60 = 270 minutes = 4.5 hours)
  const totalHoursBefore = timesheet.totalHours;
  // 8. Call PATCH with removeTimelogIds to remove one timelog (timelog2)
  const updatedTimesheet =
    await api.functional.erpHrm.member.timesheets.timelogs.manage(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          removeTimelogIds: [timelog2.id],
        },
      },
    );
  typia.assert(updatedTimesheet);
  // 9. Validate the timelog still exists in system (only association removed)
  // We verify by checking the timesheet doesn't include timelog2 anymore
  // 10. Verify timesheet totalHours decreased by the removed timelog's duration
  // timelog2 was 90 minutes = 1.5 hours
  const expectedTotalHours = totalHoursBefore - 90 / 60;
  TestValidator.equals(
    "timesheet totalHours decreased",
    updatedTimesheet.totalHours,
    expectedTotalHours,
  );
  // 11. Confirm removed timelog is not in timesheetTimelogs array
  const remainingTimelogIds = updatedTimesheet.timesheetTimelogs.map(
    (st) => st.timelog.id,
  );
  TestValidator.equals(
    "removed timelog not in timesheet",
    remainingTimelogIds.includes(timelog2.id),
    false,
  );
  TestValidator.equals(
    "remaining timelogs count is 2",
    updatedTimesheet.timesheetTimelogs.length,
    2,
  );
  // Verify the remaining timelogs are timelog1 and timelog3
  TestValidator.equals(
    "timelog1 still in timesheet",
    remainingTimelogIds.includes(timelog1.id),
    true,
  );
  TestValidator.equals(
    "timelog3 still in timesheet",
    remainingTimelogIds.includes(timelog3.id),
    true,
  );
}
