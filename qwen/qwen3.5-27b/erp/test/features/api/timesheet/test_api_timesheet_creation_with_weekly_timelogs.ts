import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import type { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
import type { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_employees_create } from "../../../generate/generate_random_hrm_time_track_member_employees_create";
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { generate_random_hrm_time_track_member_projects_create } from "../../../generate/generate_random_hrm_time_track_member_projects_create";
import { generate_random_hrm_time_track_member_timelogs_create } from "../../../generate/generate_random_hrm_time_track_member_timelogs_create";
import { generate_random_hrm_time_track_member_timesheets_create } from "../../../generate/generate_random_hrm_time_track_member_timesheets_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_timelog } from "../../../prepare/prepare_random_hrm_time_track_timelog";
import { prepare_random_hrm_time_track_timesheet } from "../../../prepare/prepare_random_hrm_time_track_timesheet";

/**
 * Test timesheet creation with automatic inclusion of weekly timelogs.
 *
 * Validates the complete timesheet creation workflow where an authenticated employee creates a draft timesheet for a specific week. The timesheet automatically includes all timelogs logged by the employee during that week period (Monday to Sunday). Verifies that the week_end_date is correctly calculated as Sunday, the timesheet is in draft status, and approval-related fields are null.
 *
 * Special attention is given to verifying that timelogs created within the week period are automatically associated with the timesheet, and that the week date calculations are accurate.
 *
 * 1. Authenticate as member to obtain authorization tokens.
 * 2. Create organization context for the employee.
 * 3. Create employee record linking the authenticated member to the organization.
 * 4. Create a project for timelog association.
 * 5. Create multiple timelogs for the target week (Monday to Sunday).
 * 6. Create a timesheet for the week with the Monday start date.
 * 7. Validate timesheet status, week dates, timelog inclusion, and null approval fields.
 */
export async function test_api_timesheet_creation_with_weekly_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(organization);
  // 3. Create employee
  const employee =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(employee);
  // 4. Create project
  const project =
    await generate_random_hrm_time_track_member_projects_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(project);
  // 5. Create timelogs for the target week
  // Calculate a Monday date (use a recent Monday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const weekStartDateTime = monday.toISOString();
  // Create 5 timelogs spread across the week (Monday to Friday)
  const timelogs: IHrmTimeTrackTimelog[] = [];
  for (let i = 0; i < 5; i++) {
    const timelogDate = new Date(monday);
    timelogDate.setDate(monday.getDate() + i);
    timelogDate.setHours(9, 0, 0, 0); // 9 AM
    const timelog = await generate_random_hrm_time_track_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: timelogDate.toISOString(),
          duration_seconds: 28800, // 8 hours in seconds
          hrm_time_track_project_id: project.id,
          billable: true,
        },
      },
    );
    typia.assert(timelog);
    timelogs.push(timelog);
  }
  // 6. Create timesheet for the week
  const timesheet =
    await generate_random_hrm_time_track_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: weekStartDateTime,
        },
      },
    );
  typia.assert(timesheet);
  // 7. Validate timesheet status is draft
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  // 8. Validate week_end_date is Sunday (6 days after Monday)
  const expectedSunday = new Date(monday);
  expectedSunday.setDate(monday.getDate() + 6);
  expectedSunday.setHours(23, 59, 59, 999);
  const expectedSundayDateTime = expectedSunday.toISOString();
  // Parse both dates and compare just the date part
  const actualEndDate = new Date(timesheet.week_end_date);
  const expectedEndDate = new Date(expectedSundayDateTime);
  TestValidator.equals(
    "week_end_date is Sunday",
    actualEndDate.getDate(),
    expectedEndDate.getDate(),
  );
  TestValidator.equals(
    "week_end_date month matches",
    actualEndDate.getMonth(),
    expectedEndDate.getMonth(),
  );
  TestValidator.equals(
    "week_end_date year matches",
    actualEndDate.getFullYear(),
    expectedEndDate.getFullYear(),
  );
  // 9. Validate timesheet includes all timelogs created for that week
  TestValidator.equals(
    "timesheet includes all 5 timelogs",
    timesheet.timelogs.length,
    5,
  );
  const timesheetTimelogIds = timesheet.timelogs.map((t) => t.id);
  for (const timelog of timelogs) {
    TestValidator.predicate(
      `timelog ${timelog.id} is included in timesheet`,
      timesheetTimelogIds.includes(timelog.id),
    );
  }
  // 10. Validate approval-related fields are null
  TestValidator.equals(
    "approved_at is null for draft timesheet",
    timesheet.approved_at,
    null,
  );
  TestValidator.equals(
    "rejected_at is null for draft timesheet",
    timesheet.rejected_at,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null for draft timesheet",
    timesheet.rejection_reason,
    null,
  );
  TestValidator.equals(
    "approver is null for draft timesheet",
    timesheet.approver,
    null,
  );
  // 11. Validate timesheet is associated with the authenticated employee
  TestValidator.equals(
    "timesheet employee matches authenticated employee",
    timesheet.employee.id,
    employee.id,
  );
}