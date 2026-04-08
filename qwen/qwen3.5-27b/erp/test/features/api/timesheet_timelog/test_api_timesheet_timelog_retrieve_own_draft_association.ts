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
 * Test that an employee can retrieve a specific timelog association from their own draft timesheet.
 *
 * Validates the complete timesheet-timelog retrieval workflow including member registration, organization setup, employee record creation, project assignment, timelog creation, and timesheet generation. Ensures that the timesheet-timelog association is correctly established and retrievable with all relationship data properly populated.
 *
 * Special attention is given to verifying that the association contains complete timelog details including project and employee information, and that the timesheet summary shows the correct draft status and week boundaries.
 *
 * 1. Register and authenticate as a member.
 * 2. Create an organization for the employee.
 * 3. Create an employee record for the authenticated member in that organization.
 * 4. Create a project within the organization.
 * 5. Create a timelog for the employee on that project.
 * 6. Create a draft timesheet for the employee covering the week containing the timelog.
 * 7. Retrieve the timesheet-timelog association and validate its structure.
 */
export async function test_api_timesheet_timelog_retrieve_own_draft_association(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection);
  typia.assert(authResponse);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(organization);
  // 3. Create an employee record for the authenticated member
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        hrm_time_track_member_id: authResponse.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create a project within the organization
  const project =
    await generate_random_hrm_time_track_member_projects_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(project);
  // 5. Create a timelog for the employee on that project
  const timelog = await generate_random_hrm_time_track_member_timelogs_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
      },
    },
  );
  typia.assert(timelog);
  // 6. Calculate the Monday of the week containing the timelog date
  const timelogDate = new Date(timelog.date);
  const dayOfWeek = timelogDate.getDay(); // 0 (Sunday) to 6 (Saturday)
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const mondayDate = new Date(timelogDate);
  mondayDate.setDate(timelogDate.getDate() - daysSinceMonday);
  mondayDate.setHours(0, 0, 0, 0);
  // Create a draft timesheet for the employee covering the week containing the timelog
  const timesheet =
    await generate_random_hrm_time_track_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: mondayDate.toISOString(),
        },
      },
    );
  typia.assert(timesheet);
  // The timesheet should include the timelog we created
  TestValidator.predicate(
    "timesheet includes the created timelog",
    timesheet.timelogs.some((tl) => tl.id === timelog.id),
  );
  // Get the timelog summary from the timesheet
  const timelogInTimesheet = timesheet.timelogs.find(
    (tl) => tl.id === timelog.id,
  );
  if (!timelogInTimesheet) {
    throw new Error("Timelog not found in timesheet");
  }
  // 7. Retrieve the timesheet-timelog association
  const association =
    await api.functional.hrmTimeTrack.member.timesheets.timelogs.at(
      memberConnection,
      {
        timesheetId: timesheet.id,
        timesheetTimelogId: timelogInTimesheet.id,
      },
    );
  typia.assert(association);
  // Validate business logic
  TestValidator.equals(
    "timesheet status is draft",
    association.timesheet.status,
    "draft",
  );
  TestValidator.equals(
    "timelog date matches",
    association.timelog.date,
    timelog.date,
  );
  TestValidator.equals(
    "timelog project matches",
    association.timelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "timelog employee matches",
    association.timelog.employee.id,
    employee.id,
  );
}