import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { generate_random_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_member_timelogs_create";
import { generate_random_hrm_time_tracking_member_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_member_timesheets_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

/**
 * Test the complete happy path for submitting a draft timesheet for managerial approval.
 *
 * Validates the full timesheet lifecycle: member registration, organization creation (which auto-creates the owner's employee record), project setup, employee project membership assignment, time logging within a specific work week, draft timesheet creation, and submission for approval.
 *
 * Special attention is given to ensuring date alignment between timelogs and timesheet week boundaries, proper extraction of the employee record for project membership, and comprehensive validation of the submission response's status, timestamps, and computed totals.
 *
 * 1. A member registers and authenticates, obtaining JWT tokens for subsequent operations.
 * 2. The member creates an organization, becoming the Owner with an auto-created employee record; the member re-authenticates to obtain the updated employee record with the employee ID.
 * 3. A project is created within the organization with a name and color code.
 * 4. The authenticated employee is added as a project member with "member" role using the employee ID from re-authentication.
 * 5. A timelog is created for a date within a Monday-to-Sunday work week (Wednesday, 2026-04-22).
 * 6. A draft timesheet is created for the work week starting Monday (2026-04-20), which auto-includes the created timelog and computes total hours.
 * 7. The draft timesheet is submitted via the submit endpoint; the response is validated for status='submitted', non-null submittedAt, total_hours matching the timelog duration, and employee reference correctness.
 */
export async function test_api_timesheet_submit_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join as a member with a known password for later re-authentication
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const authorized: IHrmTimeTrackingMember.IAuthorized =
    await authorize_member_join(connection, {
      body: {
        password: joinPassword,
      },
    });
  typia.assert(authorized);
  // Step 2: Create an organization (auto-creates employee record for the owner)
  const organization: IHrmTimeTrackingOrganization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      connection,
      {},
    );
  typia.assert(organization);
  // Re-authenticate to get the updated employee record (includes the auto-created employee)
  const refreshedAuth: IHrmTimeTrackingMember.IAuthorized =
    await authorize_member_login(connection, {
      body: {
        email: authorized.email,
        password: joinPassword,
        href: "",
        referrer: "",
      } satisfies IHrmTimeTrackingMember.ILogin,
    });
  typia.assert(refreshedAuth);
  // Extract the employee ID for the authenticated member's first employee record
  const employeeId: string = refreshedAuth.employees[0].id;
  // Step 3: Create a project within the organization
  const project: IHrmTimeTrackingProject =
    await generate_random_hrm_time_tracking_member_projects_create(
      connection,
      {},
    );
  typia.assert(project);
  // Step 4: Add the authenticated employee as a project member with "member" role
  const projectMember: IHrmTimeTrackingProjectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      connection,
      {
        body: {
          employee_id: employeeId,
          role: "member",
        } satisfies IHrmTimeTrackingProjectMember.ICreate,
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // Step 5: Define the work week dates
  const weekStartDate: string = "2026-04-20"; // Monday
  const timelogDate: string = "2026-04-22"; // Wednesday (within the week)
  const durationMinutes: number = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<60> & tags.Maximum<480>
  >();
  // Create a timelog within the work week for the project
  const timelog: IHrmTimeTrackingTimelog =
    await generate_random_hrm_time_tracking_member_timelogs_create(connection, {
      body: {
        date: timelogDate,
        duration_minutes: durationMinutes,
        project_id: project.id,
      },
    });
  typia.assert(timelog);
  // Step 6: Create a draft timesheet for the work week
  const timesheet: IHrmTimeTrackingTimesheet =
    await generate_random_hrm_time_tracking_member_timesheets_create(
      connection,
      {
        body: {
          week_start_date: weekStartDate,
        },
      },
    );
  typia.assert(timesheet);
  // Step 7: Submit the draft timesheet
  const submittedTimesheet: IHrmTimeTrackingTimesheet =
    await api.functional.hrmTimeTracking.member.timesheets.submit(connection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  // Validate the submission response
  TestValidator.predicate(
    "status is submitted",
    () => submittedTimesheet.status === "submitted",
  );
  TestValidator.predicate(
    "submittedAt is non-null",
    submittedTimesheet.submittedAt !== null &&
      submittedTimesheet.submittedAt !== undefined,
  );
  TestValidator.predicate(
    "total_hours reflects timelog durations",
    Math.abs(submittedTimesheet.totalHours - durationMinutes / 60) < 0.01,
  );
  TestValidator.predicate(
    "employee reference matches",
    () => submittedTimesheet.employee.id === employeeId,
  );
}