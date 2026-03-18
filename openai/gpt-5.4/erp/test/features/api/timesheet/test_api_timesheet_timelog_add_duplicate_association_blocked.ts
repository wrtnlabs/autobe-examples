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

export async function test_api_timesheet_timelog_add_duplicate_association_blocked(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string &
        tags.Format<"password">,
      href: "https://example.com/join" satisfies string as string &
        tags.Format<"uri">,
      referrer: "https://example.com/sign-in" satisfies string as string &
        tags.Format<"uri">,
    },
  });
  typia.assert(authorized);
  const project = await generate_random_hrm_time_tracking_projects_create(
    employeeConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#" + RandomGenerator.alphabets(6),
        status: "active",
        budget_hours: 40,
        start_date: "2024-01-01T00:00:00.000Z",
        end_date: "2024-12-31T00:00:00.000Z",
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
          workedOn: "2024-01-03T09:00:00.000Z",
          durationMinutes: 120,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          billable: true,
        } satisfies IHrmTimeTrackingTimelog.ICreate,
      },
    );
  typia.assert(timelog);
  const firstTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: "2024-01-01T00:00:00.000Z",
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(firstTimesheet);
  TestValidator.predicate(
    "first timesheet auto-includes the created timelog",
    ArrayUtil.has(firstTimesheet.timelogs, (row) => row.id === timelog.id),
  );
  const secondTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: "2024-01-08T00:00:00.000Z",
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(secondTimesheet);
  TestValidator.predicate(
    "second timesheet starts without the first-week timelog",
    ArrayUtil.has(secondTimesheet.timelogs, (row) => row.id === timelog.id) ===
      false,
  );
  await TestValidator.error(
    "reject adding a timelog already associated with another timesheet",
    async () => {
      await generate_random_hrm_time_tracking_employee_timesheets_timelogs_create(
        employeeConnection,
        {
          params: {
            timesheetId: secondTimesheet.id,
          },
          body: {
            hrm_time_tracking_timelog_id: timelog.id,
          } satisfies IHrmTimeTrackingTimesheetTimelog.ICreate,
        },
      );
    },
  );
  TestValidator.predicate(
    "original timesheet retains the existing timelog inclusion",
    ArrayUtil.has(firstTimesheet.timelogs, (row) => row.id === timelog.id),
  );
  TestValidator.predicate(
    "second timesheet remains unchanged without the duplicate timelog",
    ArrayUtil.has(secondTimesheet.timelogs, (row) => row.id === timelog.id) ===
      false,
  );
}
