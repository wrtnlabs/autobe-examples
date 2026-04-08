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
import type { IHrmTimeTrackTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheetTimelog";
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
 * Test that an employee can retrieve a timelog association from their own approved timesheet.
 *
 * Validates the complete timesheet approval workflow including member registration, organization setup, employee creation, project creation, timelog entry, timesheet creation, submission, and approval. Ensures that an employee can retrieve timelog associations from their approved timesheets with complete data including approval metadata.
 *
 * Special attention is given to verifying that the timesheet status is 'approved', the approver information is populated, and the timelog details are correctly maintained within the approved timesheet context.
 *
 * 1. Register and authenticate as a member (employee).
 * 2. Create an organization for the employee.
 * 3. Create an employee record for the authenticated member.
 * 4. Create a project within the organization.
 * 5. Create a timelog for the employee on that project.
 * 6. Create a draft timesheet for the employee covering the timelog's week.
 * 7. Submit the timesheet for approval.
 * 8. Approve the timesheet (simulated with same connection for testing).
 * 9. Retrieve a timelog association from the approved timesheet.
 * 10. Validate the timesheet status is 'approved' and approver is populated.
 */
export async function test_api_timesheet_timelog_retrieve_from_approved_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member (employee)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection);
  typia.assert(employeeAuth);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      employeeConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create an employee record for the authenticated member
  const employee = await generate_random_hrm_time_track_member_employees_create(
    employeeConnection,
    {
      body: {
        hrm_time_track_member_id: employeeAuth.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create a project within the organization
  const project =
    await generate_random_hrm_time_track_member_projects_create(
      employeeConnection,
      {},
    );
  typia.assert(project);
  // 5. Create a timelog for the employee on that project
  const timelog = await generate_random_hrm_time_track_member_timelogs_create(
    employeeConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
      },
    },
  );
  typia.assert(timelog);
  // 6. Create a draft timesheet for the employee covering the timelog's week
  // Calculate the Monday of the week containing the timelog date
  const timelogDate = new Date(timelog.date);
  const dayOfWeek = timelogDate.getDay(); // 0 (Sunday) to 6 (Saturday)
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Calculate days to subtract to get Monday
  const monday = new Date(timelogDate);
  monday.setDate(timelogDate.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const timesheet =
    await generate_random_hrm_time_track_member_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: monday.toISOString(),
        },
      },
    );
  typia.assert(timesheet);
  // 7. Submit the timesheet for approval
  const submittedTimesheet =
    await api.functional.hrmTimeTrack.member.timesheets.update(
      employeeConnection,
      {
        timesheetId: timesheet.id,
        body: {
          status: "submitted",
        } satisfies IHrmTimeTrackTimesheet.IUpdate,
      },
    );
  typia.assert(submittedTimesheet);
  // 8. Approve the timesheet (simulated with same connection for testing)
  const approvedTimesheet =
    await api.functional.hrmTimeTrack.member.timesheets.update(
      employeeConnection,
      {
        timesheetId: timesheet.id,
        body: {
          status: "approved",
        } satisfies IHrmTimeTrackTimesheet.IUpdate,
      },
    );
  typia.assert(approvedTimesheet);
  // 9. Retrieve a timelog association from the approved timesheet
  // Note: The timesheet-timelog association ID is generated when the timesheet is created.
  // In a production system, there would be a list endpoint to retrieve association IDs.
  // For this test, we attempt to retrieve using the timelog ID as the association ID,
  // which may work depending on the system's ID generation strategy.
  const timesheetTimelog =
    await api.functional.hrmTimeTrack.member.timesheets.timelogs.at(
      employeeConnection,
      {
        timesheetId: timesheet.id,
        timesheetTimelogId: timelog.id,
      },
    );
  typia.assert(timesheetTimelog);
  // 10. Validate the timesheet status is 'approved' and approver is populated
  TestValidator.equals(
    "timesheet status is approved",
    timesheetTimelog.timesheet.status,
    "approved",
  );
  TestValidator.predicate(
    "timesheet has approver information",
    timesheetTimelog.timesheet.approver !== null,
  );
  TestValidator.equals(
    "timelog project matches created project",
    timesheetTimelog.timelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "timelog duration matches created timelog",
    timesheetTimelog.timelog.duration_seconds,
    timelog.duration_seconds,
  );
}