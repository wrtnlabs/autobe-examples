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
 * Test that a timelog cannot be updated when it belongs to a submitted timesheet.
 *
 * Validates the business rule that timelogs in submitted or approved timesheets
 * are immutable (locked). The test creates an organization, an active project,
 * adds the member as a project member, creates a timelog for the current week,
 * creates a draft timesheet that auto-includes the timelog, submits the timesheet,
 * and then verifies that attempting to update the timelog's description is rejected
 * with a 422 Unprocessable Entity error.
 */
export async function test_api_timelog_update_rejected_when_timesheet_submitted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(16);
  const joinResult: IHrmTimeTrackingMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email,
        password,
      },
    });
  typia.assert(joinResult);
  // 2. Create an organization (owner gets an employee record automatically)
  const organization: IHrmTimeTrackingOrganization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Re-login to get the updated IAuthorized with the employee record
  const authResult: IHrmTimeTrackingMember.IAuthorized =
    await authorize_member_login(memberConnection, {
      body: {
        email,
        password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(authResult);
  const employee: IHrmTimeTrackingEmployee.ISummary = authResult.employees[0];
  typia.assert(employee);
  // 4. Create an active project
  const project: IHrmTimeTrackingProject =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // 5. Add the employee as a project member with "member" role
  const projectMember: IHrmTimeTrackingProjectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: employee.id,
          role: "member" as const,
        },
      },
    );
  typia.assert(projectMember);
  // 6. Compute the current work week's Monday date
  const now: Date = new Date();
  const dayOfWeek: number = now.getDay();
  const daysToMonday: number = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday: Date = new Date(now);
  monday.setDate(now.getDate() - daysToMonday);
  const weekStartDate: string = monday.toISOString().split("T")[0];
  // 7. Create a timelog within the current week
  const timelog: IHrmTimeTrackingTimelog =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: monday.toISOString(),
          project_id: project.id,
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<480>
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(timelog);
  // 8. Create a draft timesheet for the current week (auto-includes the timelog)
  const timesheet: IHrmTimeTrackingTimesheet =
    await generate_random_hrm_time_tracking_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: weekStartDate,
        },
      },
    );
  typia.assert(timesheet);
  // 9. Submit the draft timesheet for approval
  const submittedTimesheet: IHrmTimeTrackingTimesheet =
    await api.functional.hrmTimeTracking.member.timesheets.submit(
      memberConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  // 10. Attempt to update the timelog — should be rejected with 422
  await TestValidator.httpError(
    "update timelog in submitted timesheet",
    422,
    async () => {
      await api.functional.hrmTimeTracking.member.timelogs.update(
        memberConnection,
        {
          timelogId: timelog.id,
          body: {
            description: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IHrmTimeTrackingTimelog.IUpdate,
        },
      );
    },
  );
}
