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
 * Test creating a draft timesheet that automatically includes unassociated timelogs within the target work week.
 *
 * Validates that when a draft timesheet is created for a Monday-to-Sunday work week, all unassociated timelogs belonging to the employee within that date range are automatically included. Verifies the computed total hours, timelog references, and initial draft metadata.
 *
 * 1. Register a member account and authenticate.
 * 2. Create an organization (member becomes owner/employee).
 * 3. Re-authenticate to obtain updated employee records.
 * 4. Create a project within the organization.
 * 5. Add the employee as a project member with role 'member'.
 * 6. Create 3 timelogs on different dates within the target work week (Tue, Thu, Sat).
 * 7. Create a draft timesheet for the Monday of that week.
 * 8. Validate the timesheet: status=draft, total_hours matches sum, week dates correct, timelogs included, review fields null, employee reference.
 */
export async function test_api_timesheet_create_with_timelogs_auto_included(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. Member Registration
  //----
  const memberConnection: api.IConnection = { host: connection.host };
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(16) + "Aa1!";
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joinResult);
  //----
  // 2. Organization Creation
  //----
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  //----
  // 3. Re-authenticate to get employee records
  //----
  const loginResult = await authorize_member_login(memberConnection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmTimeTrackingMember.ILogin,
  });
  typia.assert(loginResult);
  const employeeId: string = loginResult.employees[0].id;
  //----
  // 4. Project Creation
  //----
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  //----
  // 5. Add Employee as Project Member
  //----
  const projectMember =
    await api.functional.hrmTimeTracking.member.projects.members.create(
      memberConnection,
      {
        projectId: project.id,
        body: {
          employee_id: employeeId,
          role: "member" as const,
        } satisfies IHrmTimeTrackingProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  //----
  // 6. Create Timelogs within Target Work Week
  //----
  // Target week: Monday 2026-04-27 to Sunday 2026-05-03
  const weekMonday = "2026-04-27";
  const timelog1 =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: "2026-04-28T10:00:00.000Z",
          duration_minutes: 120,
          project_id: project.id,
          description: "Tuesday development work",
          billable: true,
        },
      },
    );
  typia.assert(timelog1);
  const timelog2 =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: "2026-04-30T10:00:00.000Z",
          duration_minutes: 90,
          project_id: project.id,
          description: "Thursday code review",
          billable: true,
        },
      },
    );
  typia.assert(timelog2);
  const timelog3 =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: "2026-05-02T10:00:00.000Z",
          duration_minutes: 60,
          project_id: project.id,
          description: "Saturday testing session",
          billable: true,
        },
      },
    );
  typia.assert(timelog3);
  //----
  // 7. Create Draft Timesheet
  //----
  const timesheet =
    await api.functional.hrmTimeTracking.member.timesheets.create(
      memberConnection,
      {
        body: {
          week_start_date: weekMonday,
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(timesheet);
  //----
  // 8. Validate Timesheet Response
  //----
  TestValidator.equals("status is draft", timesheet.status, "draft");
  const totalMinutes = 120 + 90 + 60;
  const expectedHours = totalMinutes / 60;
  TestValidator.equals(
    "total hours matches sum of timelogs",
    timesheet.totalHours,
    expectedHours,
  );
  TestValidator.predicate("week start date is the input Monday", () =>
    new Date(timesheet.weekStartDate).toISOString().startsWith("2026-04-27"),
  );
  TestValidator.predicate("week end date is the Sunday 6 days later", () =>
    new Date(timesheet.weekEndDate).toISOString().startsWith("2026-05-03"),
  );
  TestValidator.equals("submitted_at is null", timesheet.submittedAt, null);
  TestValidator.equals("reviewed_at is null", timesheet.reviewedAt, null);
  TestValidator.equals(
    "rejection_reason is null",
    timesheet.rejectionReason,
    null,
  );
  TestValidator.equals(
    "employee id matches authenticated employee",
    timesheet.employee.id,
    employeeId,
  );
  TestValidator.predicate(
    "timelogs array contains all created timelogs",
    () => {
      const timelogIds = new Set([timelog1.id, timelog2.id, timelog3.id]);
      return (
        timesheet.timelogs.length === 3 &&
        timesheet.timelogs.every((tl) => timelogIds.has(tl.id))
      );
    },
  );
}
