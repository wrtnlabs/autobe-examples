import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IHrmTimeTrackingTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { generate_random_hrm_time_tracking_employee_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timelogs_create";
import { generate_random_hrm_time_tracking_employee_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_create";
import { generate_random_hrm_time_tracking_employee_timesheets_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_timelogs_create";
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";
import { prepare_random_hrm_time_tracking_timesheet_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet_timelog";

export async function test_api_timesheet_timelog_delete_submitted_locked(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_employee_join(employeeConnection, {
    body: {},
  });
  typia.assert(joined);
  const now: Date = new Date();
  const day: number = now.getUTCDay();
  const diffToMonday: number = day === 0 ? -6 : 1 - day;
  const monday: Date = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + diffToMonday,
      0,
      0,
      0,
      0,
    ),
  );
  const workedOn: string = new Date(
    monday.getTime() + 2 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000,
  ).toISOString();
  const weekStartDate: string = monday.toISOString();
  const project = await generate_random_hrm_time_tracking_projects_create(
    employeeConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: `#${RandomGenerator.alphabets(6)}`,
        status: "active",
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(project);
  const timelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: project.id,
          workedOn,
          durationMinutes: 120,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          billable: true,
        } satisfies IHrmTimeTrackingTimelog.ICreate,
      },
    );
  typia.assert(timelog);
  const draftTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: weekStartDate,
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(draftTimesheet);
  const attachedTimesheet: IHrmTimeTrackingTimesheet = ArrayUtil.has(
    draftTimesheet.timelogs,
    (entry) => entry.id === timelog.id,
  )
    ? draftTimesheet
    : await generate_random_hrm_time_tracking_employee_timesheets_timelogs_create(
        employeeConnection,
        {
          params: {
            timesheetId: draftTimesheet.id,
          },
          body: {
            hrm_time_tracking_timelog_id: timelog.id,
          } satisfies IHrmTimeTrackingTimesheetTimelog.ICreate,
        },
      );
  typia.assert(attachedTimesheet);
  TestValidator.predicate(
    "timelog is attached before submission",
    ArrayUtil.has(
      attachedTimesheet.timelogs,
      (entry) => entry.id === timelog.id,
    ),
  );
  TestValidator.equals(
    "draft timesheet remains draft before submission",
    attachedTimesheet.status,
    "draft",
  );
  const submittedTimesheet =
    await api.functional.hrmTimeTracking.employee.timesheets.submit(
      employeeConnection,
      {
        timesheetId: attachedTimesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "submitted timesheet id matches",
    submittedTimesheet.id,
    attachedTimesheet.id,
  );
  TestValidator.equals(
    "timesheet status becomes submitted",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted timestamp exists",
    submittedTimesheet.submitted_at !== null,
  );
  TestValidator.predicate(
    "timelog remains attached after submission",
    ArrayUtil.has(
      submittedTimesheet.timelogs,
      (entry) => entry.id === timelog.id,
    ),
  );
  await TestValidator.error(
    "employee cannot delete timelog from submitted timesheet",
    async () => {
      await api.functional.hrmTimeTracking.employee.timesheets.timelogs.erase(
        employeeConnection,
        {
          timesheetId: submittedTimesheet.id,
          timelogId: timelog.id,
        },
      );
    },
  );
  TestValidator.predicate(
    "submitted snapshot still contains locked timelog",
    ArrayUtil.has(
      submittedTimesheet.timelogs,
      (entry) => entry.id === timelog.id,
    ),
  );
}
