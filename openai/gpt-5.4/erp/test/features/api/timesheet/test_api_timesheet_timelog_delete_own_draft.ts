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

export async function test_api_timesheet_timelog_delete_own_draft(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingEmployee.IAuthorized =
    await authorize_employee_join(employeeConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(authorized);
  const now: Date = new Date();
  const dayOfWeek: number = now.getUTCDay();
  const daysFromMonday: number = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday: Date = new Date(
    now.getTime() - daysFromMonday * 24 * 60 * 60 * 1000,
  );
  monday.setUTCHours(0, 0, 0, 0);
  const workedDate: Date = new Date(monday.getTime() + 2 * 24 * 60 * 60 * 1000);
  workedDate.setUTCHours(9, 0, 0, 0);
  const project: IHrmTimeTrackingProject =
    await generate_random_hrm_time_tracking_projects_create(
      employeeConnection,
      {
        body: {
          name: `Project ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#" + RandomGenerator.alphaNumeric(6),
          status: "active",
        },
      },
    );
  typia.assert(project);
  const timelogInput = {
    hrmTimeTrackingProjectId: project.id,
    workedOn: workedDate.toISOString(),
    durationMinutes: 90,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    billable: true,
  } satisfies IHrmTimeTrackingTimelog.ICreate;
  const timelog: IHrmTimeTrackingTimelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: timelogInput,
      },
    );
  typia.assert(timelog);
  const timesheet: IHrmTimeTrackingTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: monday.toISOString(),
        },
      },
    );
  typia.assert(timesheet);
  const attachedTimesheet: IHrmTimeTrackingTimesheet = timesheet.timelogs.some(
    (entry) => entry.id === timelog.id,
  )
    ? timesheet
    : await generate_random_hrm_time_tracking_employee_timesheets_timelogs_create(
        employeeConnection,
        {
          params: {
            timesheetId: timesheet.id,
          },
          body: {
            hrm_time_tracking_timelog_id: timelog.id,
          },
        },
      );
  typia.assert(attachedTimesheet);
  const targetTimelog: IHrmTimeTrackingTimelog | undefined =
    attachedTimesheet.timelogs.find((entry) => entry.id === timelog.id);
  TestValidator.equals(
    "timesheet owner matches employee",
    attachedTimesheet.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "timesheet remains draft",
    attachedTimesheet.status,
    "draft",
  );
  TestValidator.predicate(
    "target timelog is attached before deletion",
    targetTimelog !== undefined,
  );
  if (targetTimelog === undefined) {
    throw new Error("Expected target timelog to be attached before deletion.");
  }
  TestValidator.equals(
    "timelog employee matches employee",
    targetTimelog.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "timelog project matches created project",
    targetTimelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "timelog worked date matches input",
    targetTimelog.worked_on,
    timelogInput.workedOn,
  );
  TestValidator.equals(
    "timelog duration matches input",
    targetTimelog.duration_minutes,
    timelogInput.durationMinutes,
  );
  TestValidator.equals(
    "timelog description matches input",
    targetTimelog.description,
    timelogInput.description ?? null,
  );
  TestValidator.equals(
    "timelog billable matches input",
    targetTimelog.billable,
    timelogInput.billable,
  );
  TestValidator.predicate(
    "pre-delete timesheet has timelogs",
    attachedTimesheet.timelogs.length > 0,
  );
  TestValidator.predicate(
    "pre-delete total hours is positive",
    attachedTimesheet.total_hours > 0,
  );
  await api.functional.hrmTimeTracking.employee.timesheets.timelogs.erase(
    employeeConnection,
    {
      timesheetId: attachedTimesheet.id,
      timelogId: timelog.id,
    },
  );
  await TestValidator.error(
    "deleted timelog can no longer be re-attached",
    async () => {
      await generate_random_hrm_time_tracking_employee_timesheets_timelogs_create(
        employeeConnection,
        {
          params: {
            timesheetId: attachedTimesheet.id,
          },
          body: {
            hrm_time_tracking_timelog_id: timelog.id,
          },
        },
      );
    },
  );
}
