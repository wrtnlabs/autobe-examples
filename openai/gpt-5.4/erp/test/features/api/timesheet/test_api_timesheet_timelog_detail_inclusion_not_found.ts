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
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

export async function test_api_timesheet_timelog_detail_inclusion_not_found(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!" as string & tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const monday = new Date("2025-01-06T00:00:00.000Z");
  const nextMonday = new Date("2025-01-13T00:00:00.000Z");
  const project = await generate_random_hrm_time_tracking_projects_create(
    employeeConnection,
    {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#33aa55",
        status: "active",
        budget_hours: 40,
        start_date: monday.toISOString(),
        end_date: null,
      },
    },
  );
  typia.assert(project);
  const timesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: monday.toISOString(),
        },
      },
    );
  typia.assert(timesheet);
  const timelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: project.id,
          hrmTimeTrackingTaskId: null,
          workedOn: nextMonday.toISOString(),
          durationMinutes: 60,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          billable: true,
        },
      },
    );
  typia.assert(timelog);
  TestValidator.equals(
    "timesheet belongs to created employee",
    timesheet.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "timelog belongs to same employee",
    timelog.employee.id,
    timesheet.employee.id,
  );
  TestValidator.predicate(
    "unrelated timelog is not included in timesheet",
    timesheet.timelogs.every((included) => included.id !== timelog.id),
  );
  await TestValidator.httpError(
    "timesheet timelog detail rejects timelog not included in parent timesheet",
    404,
    async () => {
      await api.functional.hrmTimeTracking.employee.timesheets.timelogs.at(
        employeeConnection,
        {
          timesheetId: timesheet.id,
          timelogId: timelog.id,
        },
      );
    },
  );
}
