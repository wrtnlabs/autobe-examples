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
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

export async function test_api_timesheet_create_draft_with_weekly_timelogs(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = {
    host: connection.host,
  };
  const joined = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/hrm/timesheets",
      referrer: "https://example.com/hrm",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joined);
  const now = new Date();
  const currentDay = now.getUTCDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
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
  const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
  const mondayWorkedOn = new Date(
    monday.getTime() + 9 * 60 * 60 * 1000,
  ).toISOString();
  const wednesdayWorkedOn = new Date(
    monday.getTime() + (2 * 24 + 10) * 60 * 60 * 1000,
  ).toISOString();
  const nextMondayWorkedOn = new Date(
    monday.getTime() + (7 * 24 + 9) * 60 * 60 * 1000,
  ).toISOString();
  const inRangeTimelogOne =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          workedOn: mondayWorkedOn,
          durationMinutes: 120,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: true,
        },
      },
    );
  typia.assert(inRangeTimelogOne);
  const inRangeTimelogTwo =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          workedOn: wednesdayWorkedOn,
          durationMinutes: 90,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: false,
        },
      },
    );
  typia.assert(inRangeTimelogTwo);
  const outOfRangeTimelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          workedOn: nextMondayWorkedOn,
          durationMinutes: 45,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: true,
        },
      },
    );
  typia.assert(outOfRangeTimelog);
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
  TestValidator.equals(
    "employee ownership matches authenticated employee",
    timesheet.employee.id,
    joined.id,
  );
  TestValidator.equals(
    "organization matches current organization",
    timesheet.organization.id,
    joined.role.organization.id,
  );
  TestValidator.equals(
    "week_start_date matches requested Monday",
    timesheet.week_start_date,
    monday.toISOString(),
  );
  TestValidator.equals(
    "week_end_date matches derived Sunday boundary",
    timesheet.week_end_date,
    sunday.toISOString(),
  );
  TestValidator.equals(
    "timesheet starts in draft status",
    timesheet.status,
    "draft",
  );
  TestValidator.equals(
    "submitted_at starts null",
    timesheet.submitted_at,
    null,
  );
  TestValidator.equals("reviewed_at starts null", timesheet.reviewed_at, null);
  TestValidator.equals(
    "rejection_reason starts null",
    timesheet.rejection_reason,
    null,
  );
  const includedIds = timesheet.timelogs.map((timelog) => timelog.id);
  TestValidator.predicate(
    "includes first in-range timelog",
    includedIds.includes(inRangeTimelogOne.id),
  );
  TestValidator.predicate(
    "includes second in-range timelog",
    includedIds.includes(inRangeTimelogTwo.id),
  );
  TestValidator.predicate(
    "excludes out-of-range timelog",
    includedIds.includes(outOfRangeTimelog.id) === false,
  );
  TestValidator.predicate(
    "all included timelogs belong to same employee",
    timesheet.timelogs.every((timelog) => timelog.employee.id === joined.id),
  );
  TestValidator.predicate(
    "all included timelogs belong to same organization",
    timesheet.timelogs.every(
      (timelog) => timelog.organization.id === timesheet.organization.id,
    ),
  );
  const expectedTotalHours =
    (inRangeTimelogOne.duration_minutes + inRangeTimelogTwo.duration_minutes) /
    60;
  TestValidator.equals(
    "total_hours sums only included in-range timelogs",
    timesheet.total_hours,
    expectedTotalHours,
  );
}
