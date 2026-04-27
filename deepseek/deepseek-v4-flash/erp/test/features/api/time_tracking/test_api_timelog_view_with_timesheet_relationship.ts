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
import type { IPageIHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployee";
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

export async function test_api_timelog_view_with_timesheet_relationship(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memConnection, {});
  typia.assert(authorized);
  // 2. Create an organization
  const org =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memConnection,
      {},
    );
  typia.assert(org);
  // 3. Retrieve own employee ID
  const employeePage = await api.functional.hrmTimeTracking.employees.index(
    memConnection,
    {
      body: {},
    },
  );
  typia.assert(employeePage);
  const myEmployee = employeePage.data[0];
  typia.assert(myEmployee);
  // 4. Create a project
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memConnection,
      {},
    );
  typia.assert(project);
  // 5. Add self as a project member
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memConnection,
      {
        body: {
          employee_id: myEmployee.id,
          role: "member",
        } satisfies IHrmTimeTrackingProjectMember.ICreate,
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMember);
  // 6. Create a timelog within the current work week (Apr 20 Mon - Apr 26 Sun)
  const timelog =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memConnection,
      {
        body: {
          date: "2026-04-22T00:00:00.000Z",
          project_id: project.id,
          duration_minutes: 120,
        },
      },
    );
  typia.assert(timelog);
  // 7. Create a draft timesheet for the current week
  const timesheet =
    await generate_random_hrm_time_tracking_member_timesheets_create(
      memConnection,
      {
        body: {
          week_start_date: "2026-04-20",
        },
      },
    );
  typia.assert(timesheet);
  // 8. Submit the timesheet for approval
  const submittedTimesheet =
    await api.functional.hrmTimeTracking.member.timesheets.submit(
      memConnection,
      { timesheetId: timesheet.id },
    );
  typia.assert(submittedTimesheet);
  // 9. View the timelog and verify timesheet relationship data
  const retrievedTimelog =
    await api.functional.hrmTimeTracking.member.timelogs.at(memConnection, {
      timelogId: timelog.id,
    });
  typia.assert(retrievedTimelog);
  // Verify timesheet relationship
  TestValidator.equals(
    "timelog should be associated with a timesheet",
    retrievedTimelog.timesheet !== null,
    true,
  );
  const ts = retrievedTimelog.timesheet!;
  TestValidator.equals("timesheet id matches", ts.id, timesheet.id);
  TestValidator.equals(
    "timesheet status reflects submission",
    ts.status,
    "submitted",
  );
  TestValidator.equals(
    "timesheet employee id matches authenticated employee",
    ts.employee.id,
    myEmployee.id,
  );
}
