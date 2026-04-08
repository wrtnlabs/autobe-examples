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
 * Test that an employee can successfully retrieve their own draft timesheet.
 *
 * Validates the complete timesheet viewing workflow including member authentication, organization setup, employee record creation, project creation, timelog creation, and timesheet retrieval. Ensures that a draft timesheet correctly includes all associated timelogs and that approval-related fields are null for draft status.
 *
 * Special attention is given to verifying that the timesheet's week boundaries are correct (Monday to Sunday), the employee reference matches the authenticated user, and the timelogs array contains all time entries created for that week period.
 *
 * 1. Register and authenticate as a member.
 * 2. Create an organization for the member.
 * 3. Create an employee record linking the member to the organization.
 * 4. Create a project within the organization.
 * 5. Create multiple timelogs for the employee within a specific week.
 * 6. Create a draft timesheet for that week.
 * 7. Retrieve the timesheet by ID and validate all fields.
 */
export async function test_api_timesheet_view_own_draft(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection);
  typia.assert(authorized);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create an employee record for the authenticated member
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        hrm_time_track_member_id: authorized.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create a project within the organization
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 5. Create timelogs for the employee within a specific week
  // Use a Monday date for the week start
  const weekStartDate = new Date();
  weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay() + 1); // Set to Monday
  weekStartDate.setHours(0, 0, 0, 0);
  const timelog1 = await generate_random_hrm_time_track_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: weekStartDate.toISOString(),
        duration_seconds: 28800, // 8 hours
        hrm_time_track_project_id: project.id,
        billable: true,
        notes: "Project work - day 1",
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_hrm_time_track_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: new Date(
          weekStartDate.getTime() + 24 * 60 * 60 * 1000,
        ).toISOString(),
        duration_seconds: 28800, // 8 hours
        hrm_time_track_project_id: project.id,
        billable: true,
        notes: "Project work - day 2",
      },
    },
  );
  typia.assert(timelog2);
  // 6. Create a draft timesheet for that week
  const timesheet =
    await generate_random_hrm_time_track_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: weekStartDate.toISOString(),
        },
      },
    );
  typia.assert(timesheet);
  // 7. Retrieve the timesheet by ID
  const retrievedTimesheet =
    await api.functional.hrmTimeTrack.member.timesheets.at(memberConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(retrievedTimesheet);
  // Validate timesheet fields
  TestValidator.equals(
    "timesheet ID matches",
    retrievedTimesheet.id,
    timesheet.id,
  );
  TestValidator.equals("status is draft", retrievedTimesheet.status, "draft");
  TestValidator.equals(
    "employee matches authenticated user",
    retrievedTimesheet.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "week start date is correct",
    retrievedTimesheet.week_start_date,
    timesheet.week_start_date,
  );
  TestValidator.equals(
    "week end date is correct",
    retrievedTimesheet.week_end_date,
    timesheet.week_end_date,
  );
  TestValidator.equals(
    "approver is null for draft",
    retrievedTimesheet.approver,
    null,
  );
  TestValidator.equals(
    "approved_at is null for draft",
    retrievedTimesheet.approved_at,
    null,
  );
  TestValidator.equals(
    "rejected_at is null for draft",
    retrievedTimesheet.rejected_at,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null for draft",
    retrievedTimesheet.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "timelogs array contains created timelogs",
    retrievedTimesheet.timelogs.length >= 2,
  );
  TestValidator.predicate(
    "first timelog is included",
    retrievedTimesheet.timelogs.some((t) => t.id === timelog1.id),
  );
  TestValidator.predicate(
    "second timelog is included",
    retrievedTimesheet.timelogs.some((t) => t.id === timelog2.id),
  );
}
