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
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";
import { prepare_random_hrm_time_tracking_timesheet_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet_timelog";

export async function test_api_timesheet_submit_same_week_conflict(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16) satisfies string;
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
      href: "https://example.com/hrm/timesheets",
      referrer: "https://example.com/hrm",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const now = new Date();
  const utcDay = now.getUTCDay();
  const diffToMonday = utcDay === 0 ? -6 : 1 - utcDay;
  const monday = new Date(
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
  const weekStartDate = monday.toISOString() satisfies string;
  const workedOn = new Date(
    Date.UTC(
      monday.getUTCFullYear(),
      monday.getUTCMonth(),
      monday.getUTCDate(),
      9,
      0,
      0,
      0,
    ),
  ).toISOString() satisfies string;
  const firstTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: weekStartDate,
        },
      },
    );
  typia.assert(firstTimesheet);
  TestValidator.equals(
    "first timesheet starts as draft",
    firstTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "first timesheet submitted_at starts null",
    firstTimesheet.submitted_at,
    null,
  );
  const firstTimelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          workedOn,
          durationMinutes: 60,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: true,
        },
      },
    );
  typia.assert(firstTimelog);
  const firstAttached =
    await generate_random_hrm_time_tracking_employee_timesheets_timelogs_create(
      employeeConnection,
      {
        params: {
          timesheetId: firstTimesheet.id,
        },
        body: {
          hrm_time_tracking_timelog_id: firstTimelog.id,
        },
      },
    );
  typia.assert(firstAttached);
  TestValidator.predicate(
    "first timesheet has attached timelog",
    firstAttached.timelogs.length > 0,
  );
  const submitted =
    await api.functional.hrmTimeTracking.employee.timesheets.submit(
      employeeConnection,
      {
        timesheetId: firstTimesheet.id,
      },
    );
  typia.assert(submitted);
  TestValidator.equals(
    "submitted timesheet id",
    submitted.id,
    firstTimesheet.id,
  );
  TestValidator.equals("submitted status", submitted.status, "submitted");
  TestValidator.predicate(
    "submitted_at assigned",
    submitted.submitted_at !== null,
  );
  TestValidator.equals("reviewed_at remains null", submitted.reviewed_at, null);
  TestValidator.equals(
    "rejection_reason remains null",
    submitted.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "submitted timesheet still has timelogs",
    submitted.timelogs.length > 0,
  );
  await TestValidator.error(
    "duplicate same-week timesheet creation or conflicting submit is rejected",
    async () => {
      const secondTimesheet =
        await generate_random_hrm_time_tracking_employee_timesheets_create(
          employeeConnection,
          {
            body: {
              week_start_date: weekStartDate,
            },
          },
        );
      typia.assert(secondTimesheet);
      TestValidator.equals(
        "second timesheet starts as draft",
        secondTimesheet.status,
        "draft",
      );
      TestValidator.equals(
        "second timesheet submitted_at starts null",
        secondTimesheet.submitted_at,
        null,
      );
      const secondTimelog =
        await generate_random_hrm_time_tracking_employee_timelogs_create(
          employeeConnection,
          {
            body: {
              workedOn,
              durationMinutes: 30,
              description: RandomGenerator.paragraph({ sentences: 2 }),
              billable: false,
            },
          },
        );
      typia.assert(secondTimelog);
      const secondAttached =
        await generate_random_hrm_time_tracking_employee_timesheets_timelogs_create(
          employeeConnection,
          {
            params: {
              timesheetId: secondTimesheet.id,
            },
            body: {
              hrm_time_tracking_timelog_id: secondTimelog.id,
            },
          },
        );
      typia.assert(secondAttached);
      TestValidator.equals(
        "second timesheet remains draft before conflicting submit",
        secondAttached.status,
        "draft",
      );
      TestValidator.equals(
        "second timesheet submitted_at remains null before conflicting submit",
        secondAttached.submitted_at,
        null,
      );
      TestValidator.equals(
        "second timesheet reviewed_at remains null before conflicting submit",
        secondAttached.reviewed_at,
        null,
      );
      TestValidator.equals(
        "second timesheet rejection_reason remains null before conflicting submit",
        secondAttached.rejection_reason,
        null,
      );
      await api.functional.hrmTimeTracking.employee.timesheets.submit(
        employeeConnection,
        {
          timesheetId: secondTimesheet.id,
        },
      );
    },
  );
}
