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

export async function test_api_timesheet_timelog_detail_draft_included_entry(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/hrm/timesheets",
      referrer: "https://example.com/hrm/dashboard",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies DeepPartial<IHrmTimeTrackingEmployee.IJoin>,
  });
  typia.assert(authorized);
  const workedOn = new Date("2026-03-12T09:30:00.000Z").toISOString();
  const weekStartDate = new Date("2026-03-09T00:00:00.000Z").toISOString();
  const weekEndDate = new Date("2026-03-15T23:59:59.999Z").toISOString();
  const project = await generate_random_hrm_time_tracking_projects_create(
    employeeConnection,
    {
      body: {
        name: `Project ${RandomGenerator.name()}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3366FF",
        status: "active",
        budget_hours: 40,
        start_date: weekStartDate,
        end_date: weekEndDate,
      } satisfies DeepPartial<IHrmTimeTrackingProject.ICreate>,
    },
  );
  typia.assert(project);
  const timelogDescription = RandomGenerator.paragraph({ sentences: 3 });
  const timelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: project.id,
          hrmTimeTrackingTaskId: null,
          workedOn,
          durationMinutes: 135,
          description: timelogDescription,
          billable: true,
        } satisfies DeepPartial<IHrmTimeTrackingTimelog.ICreate>,
      },
    );
  typia.assert(timelog);
  const createdTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: weekStartDate,
        } satisfies DeepPartial<IHrmTimeTrackingTimesheet.ICreate>,
      },
    );
  typia.assert(createdTimesheet);
  TestValidator.equals(
    "timesheet starts as draft",
    createdTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "timesheet submitted_at starts null",
    createdTimesheet.submitted_at,
    null,
  );
  TestValidator.equals(
    "timesheet reviewed_at starts null",
    createdTimesheet.reviewed_at,
    null,
  );
  TestValidator.equals(
    "timesheet rejection_reason starts null",
    createdTimesheet.rejection_reason,
    null,
  );
  const alreadyIncluded = ArrayUtil.has(
    createdTimesheet.timelogs,
    (entry) => entry.id === timelog.id,
  );
  const targetTimesheet = alreadyIncluded
    ? createdTimesheet
    : await generate_random_hrm_time_tracking_employee_timesheets_timelogs_create(
        employeeConnection,
        {
          params: {
            timesheetId: createdTimesheet.id,
          },
          body: {
            hrm_time_tracking_timelog_id: timelog.id,
          } satisfies DeepPartial<IHrmTimeTrackingTimesheetTimelog.ICreate>,
        },
      );
  typia.assert(targetTimesheet);
  TestValidator.predicate(
    "timelog is actively linked to the specified timesheet",
    ArrayUtil.has(targetTimesheet.timelogs, (entry) => entry.id === timelog.id),
  );
  TestValidator.equals(
    "timesheet remains draft",
    targetTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "timesheet submitted_at remains null",
    targetTimesheet.submitted_at,
    null,
  );
  TestValidator.equals(
    "timesheet reviewed_at remains null",
    targetTimesheet.reviewed_at,
    null,
  );
  TestValidator.equals(
    "timesheet rejection_reason remains null",
    targetTimesheet.rejection_reason,
    null,
  );
  const included =
    await api.functional.hrmTimeTracking.employee.timesheets.timelogs.at(
      employeeConnection,
      {
        timesheetId: targetTimesheet.id,
        timelogId: timelog.id,
      },
    );
  typia.assert(included);
  TestValidator.equals("included timelog id matches", included.id, timelog.id);
  TestValidator.equals(
    "included project matches",
    included.project.id,
    project.id,
  );
  TestValidator.equals(
    "included employee matches authenticated employee",
    included.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "worked_on matches",
    included.worked_on,
    timelog.worked_on,
  );
  TestValidator.equals(
    "duration_minutes matches",
    included.duration_minutes,
    timelog.duration_minutes,
  );
  TestValidator.equals(
    "description matches",
    included.description,
    timelog.description,
  );
  TestValidator.equals("billable matches", included.billable, timelog.billable);
  TestValidator.equals(
    "nested read is side-effect free for status",
    targetTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "nested read is side-effect free for submitted_at",
    targetTimesheet.submitted_at,
    null,
  );
  TestValidator.equals(
    "nested read is side-effect free for reviewed_at",
    targetTimesheet.reviewed_at,
    null,
  );
  TestValidator.equals(
    "nested read is side-effect free for rejection_reason",
    targetTimesheet.rejection_reason,
    null,
  );
}
