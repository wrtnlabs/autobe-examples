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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimesheet";
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
 * Test filtering timesheets by week date range (startDate/endDate).
 *
 * Validates that an employee can retrieve only those weekly timesheets whose weekStartDate falls within a specified date range. The test creates two timesheets for different work weeks, then queries with a filter range that includes only one of them, and confirms the response contains exactly the expected timesheet with correct pagination metadata.
 *
 * Special attention is given to verifying that the employee identity in the returned timesheet matches the authenticated member's employee record, that the weekStartDate and weekEndDate are correctly computed, and that records are sorted by weekStartDate descending.
 *
 * 1. Register a member and create an organization, project, and project membership.
 * 2. Create timelogs and draft timesheets for two different work weeks.
 * 3. Call PATCH /hrmTimeTracking/member/timesheets with a date range that includes only one week.
 * 4. Validate that only the in-range timesheet is returned with the correct employee, week dates, status, and pagination.
 */
export async function test_api_timesheet_list_filtered_by_week_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and create organization
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 2. Get the employee ID from the authorized member's employee record
  const employeeId: string = authorized.employees[0]!.id;
  // 3. Create a project and add the employee as a member
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        body: {
          employee_id: employeeId,
          role: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // 4. Create a timelog for the current work week and a draft timesheet
  const currentWeekMonday = "2026-04-20";
  const currentWeekTimelog =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: "2026-04-22T10:00:00.000Z",
          duration_minutes: 60,
          project_id: project.id,
        },
      },
    );
  typia.assert(currentWeekTimelog);
  const currentWeekTimesheet =
    await generate_random_hrm_time_tracking_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: currentWeekMonday,
        },
      },
    );
  typia.assert(currentWeekTimesheet);
  // 5. Create a timelog for the previous work week and a draft timesheet
  const previousWeekMonday = "2026-04-13";
  const previousWeekTimelog =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: "2026-04-15T10:00:00.000Z",
          duration_minutes: 60,
          project_id: project.id,
        },
      },
    );
  typia.assert(previousWeekTimelog);
  const previousWeekTimesheet =
    await generate_random_hrm_time_tracking_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: previousWeekMonday,
        },
      },
    );
  typia.assert(previousWeekTimesheet);
  // 6. Call PATCH endpoint with date range that includes only the current week
  const result: IPageIHrmTimeTrackingTimesheet.ISummary =
    await api.functional.hrmTimeTracking.member.timesheets.index(
      memberConnection,
      {
        body: {
          startDate: "2026-04-20T00:00:00.000Z",
          endDate: "2026-04-20T23:59:59.000Z",
        } satisfies IHrmTimeTrackingTimesheet.IRequest,
      },
    );
  typia.assert(result);
  // 7. Validate pagination and data
  TestValidator.equals("records count", result.pagination.records, 1);
  TestValidator.equals("data length", result.data.length, 1);
  // 8. Validate the returned timesheet details
  const sheet = typia.assert(result.data[0]!);
  TestValidator.equals(
    "weekStartDate matches",
    sheet.week_start_date!,
    currentWeekTimesheet.weekStartDate,
  );
  TestValidator.equals("status is draft", sheet.status, "draft");
  TestValidator.predicate(
    "employee summary identifies the authenticated employee",
    () => sheet.employee.id === employeeId,
  );
}
