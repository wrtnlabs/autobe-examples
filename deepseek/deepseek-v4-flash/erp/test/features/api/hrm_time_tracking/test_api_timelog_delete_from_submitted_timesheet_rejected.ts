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
 * Test that attempting to delete a timelog from a submitted timesheet is rejected.
 *
 * Validates the business rule that timelogs belonging to submitted timesheets are locked and cannot be deleted. The system returns 422 Unprocessable Entity when such a deletion is attempted.
 *
 * 1. Register a member and authenticate.
 * 2. Create an organization, project, and add the employee as a project member.
 * 3. Create a timelog within a known work week (Monday 2025-01-06).
 * 4. Create and submit a timesheet for that week — the timelog is auto-included.
 * 5. Attempt to delete the timelog — expect 422 Unprocessable Entity.
 * 6. Verify the timelog is still present in the submitted timesheet's timelogs array.
 */
export async function test_api_timelog_delete_from_submitted_timesheet_rejected(
  connection: api.IConnection,
): Promise<void> {
  // ---- Prerequisites ----
  // 1. Register a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberPassword = "testpassword1234";
  const joinAuth = await authorize_member_join(memberConnection, {
    body: { password: memberPassword },
  });
  typia.assert(joinAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create project
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // 4. Re-login to get fresh authorized data with employee records
  const loginConnection: api.IConnection = { host: connection.host };
  const freshAuth = await authorize_member_login(loginConnection, {
    body: {
      email: joinAuth.email,
      password: memberPassword,
      href: "",
      referrer: "",
    } satisfies IHrmTimeTrackingMember.ILogin,
  });
  typia.assert(freshAuth);
  const employeeId: string = freshAuth.employees[0]!.id;
  // 5. Add the authenticated employee as a project member with role 'member'
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        body: {
          employee_id: employeeId,
          role: "member" as const,
        },
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMember);
  // 6. Create a timelog within a known work week (Monday 2025-01-06)
  const timelogDate = "2025-01-08T00:00:00.000Z"; // Wednesday within the week
  const timelog =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: timelogDate,
          project_id: project.id,
          duration_minutes: 60,
        },
      },
    );
  typia.assert(timelog);
  // 7. Create a draft timesheet for that week (Monday 2025-01-06)
  const timesheet =
    await generate_random_hrm_time_tracking_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: "2025-01-06", // Monday date format
        },
      },
    );
  typia.assert(timesheet);
  // 8. Submit the timesheet
  const submittedTimesheet =
    await api.functional.hrmTimeTracking.member.timesheets.submit(
      memberConnection,
      { timesheetId: timesheet.id },
    );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet status",
    submittedTimesheet.status,
    "submitted",
  );
  // ---- Test: delete rejection ----
  // 9. Attempt to delete the timelog — expect 422 Unprocessable Entity
  await TestValidator.httpError(
    "delete timelog from submitted timesheet rejected",
    422,
    async () => {
      await api.functional.hrmTimeTracking.member.timelogs.erase(
        memberConnection,
        { timelogId: timelog.id },
      );
    },
  );
  // 10. Verify the timelog still exists in the submitted timesheet
  TestValidator.predicate(
    "timelog still exists in submitted timesheet",
    submittedTimesheet.timelogs.some((tl) => tl.id === timelog.id),
  );
}
