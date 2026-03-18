import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeWeeklySummary";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingEmployeeWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployeeWeeklySummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { generate_random_hrm_time_tracking_employee_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timelogs_create";
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";

export async function test_api_weekly_summary_report_chronological_aggregation(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" satisfies string as string &
        tags.Format<"password">,
      href: "https://example.com/hrm/weekly-summary" satisfies string as string &
        tags.Format<"uri">,
      referrer: "https://example.com/hrm" satisfies string as string &
        tags.Format<"uri">,
      ip: "127.0.0.1" satisfies string as string & tags.Format<"ipv4">,
    },
  });
  typia.assert(authorized);
  const project = await generate_random_hrm_time_tracking_projects_create(
    employeeConnection,
    {
      body: {
        name: `weekly-summary-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#33AA88",
        status: "active",
      },
    },
  );
  typia.assert(project);
  const weekOneMonday = new Date("2026-01-05T00:00:00.000Z");
  const weekOneWednesday = new Date("2026-01-07T09:00:00.000Z");
  const weekOneFriday = new Date("2026-01-09T15:30:00.000Z");
  const weekTwoMonday = new Date("2026-01-12T08:00:00.000Z");
  const weekTwoThursday = new Date("2026-01-15T13:15:00.000Z");
  const outOfRangeMonday = new Date("2026-01-19T10:00:00.000Z");
  const weekOneLogA =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: project.id,
          workedOn: weekOneMonday.toISOString(),
          durationMinutes: 120,
          description: "Week one Monday focus work",
          billable: true,
        },
      },
    );
  typia.assert(weekOneLogA);
  const weekOneLogB =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: project.id,
          workedOn: weekOneWednesday.toISOString(),
          durationMinutes: 60,
          description: "Week one Wednesday support work",
          billable: false,
        },
      },
    );
  typia.assert(weekOneLogB);
  const weekOneLogC =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: project.id,
          workedOn: weekOneFriday.toISOString(),
          durationMinutes: 30,
          description: "Week one Friday wrap-up",
          billable: true,
        },
      },
    );
  typia.assert(weekOneLogC);
  const weekTwoLogA =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: project.id,
          workedOn: weekTwoMonday.toISOString(),
          durationMinutes: 90,
          description: "Week two Monday planning",
          billable: true,
        },
      },
    );
  typia.assert(weekTwoLogA);
  const weekTwoLogB =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: project.id,
          workedOn: weekTwoThursday.toISOString(),
          durationMinutes: 150,
          description: "Week two Thursday delivery",
          billable: false,
        },
      },
    );
  typia.assert(weekTwoLogB);
  const outOfRangeLog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: project.id,
          workedOn: outOfRangeMonday.toISOString(),
          durationMinutes: 600,
          description: "Out of range work that must be excluded",
          billable: true,
        },
      },
    );
  typia.assert(outOfRangeLog);
  const requestBody = {
    startDate: weekOneMonday.toISOString(),
    endDate: new Date("2026-01-18T23:59:59.999Z").toISOString(),
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackingEmployeeWeeklySummary.IRequest;
  const report =
    await api.functional.hrmTimeTracking.employee.weeklySummaries.index(
      employeeConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(report);
  TestValidator.equals("pagination current page", report.pagination.current, 1);
  TestValidator.equals("pagination limit", report.pagination.limit, 10);
  TestValidator.predicate("weekly summary rows exist", report.data.length >= 2);
  TestValidator.predicate(
    "pagination records cover returned rows",
    report.pagination.records >= report.data.length,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    report.pagination.pages >= 0,
  );
  const expectedWeekOneStart = weekOneMonday.toISOString();
  const expectedWeekTwoStart = new Date(
    "2026-01-12T00:00:00.000Z",
  ).toISOString();
  const expectedWeekOneHours = (120 + 60 + 30) / 60;
  const expectedWeekTwoHours = (90 + 150) / 60;
  const expectedRows = report.data.filter(
    (row) =>
      row.week_start_date === expectedWeekOneStart ||
      row.week_start_date === expectedWeekTwoStart,
  );
  TestValidator.equals(
    "two expected weekly rows found",
    expectedRows.length,
    2,
  );
  const sortedRows = [...report.data].sort(
    (x, y) =>
      new Date(x.week_start_date).getTime() -
      new Date(y.week_start_date).getTime(),
  );
  TestValidator.equals(
    "default chronological ordering",
    report.data,
    sortedRows,
  );
  const weekOneRow = typia.assert<IHrmTimeTrackingEmployeeWeeklySummary.ISummary>(
    expectedRows.find((row) => row.week_start_date === expectedWeekOneStart),
  );
  const weekTwoRow = typia.assert<IHrmTimeTrackingEmployeeWeeklySummary.ISummary>(
    expectedRows.find((row) => row.week_start_date === expectedWeekTwoStart),
  );
  const isMonday = (value: string): boolean =>
    new Date(value).getUTCDay() === 1;
  const isSunday = (value: string): boolean =>
    new Date(value).getUTCDay() === 0;
  const diffDays = (start: string, end: string): number =>
    (new Date(end).getTime() - new Date(start).getTime()) /
    (1000 * 60 * 60 * 24);
  TestValidator.predicate(
    "week one starts Monday",
    isMonday(weekOneRow.week_start_date),
  );
  TestValidator.predicate(
    "week one ends Sunday",
    isSunday(weekOneRow.week_end_date),
  );
  TestValidator.equals(
    "week one spans same business week",
    diffDays(weekOneRow.week_start_date, weekOneRow.week_end_date),
    6,
  );
  TestValidator.predicate(
    "week two starts Monday",
    isMonday(weekTwoRow.week_start_date),
  );
  TestValidator.predicate(
    "week two ends Sunday",
    isSunday(weekTwoRow.week_end_date),
  );
  TestValidator.equals(
    "week two spans same business week",
    diffDays(weekTwoRow.week_start_date, weekTwoRow.week_end_date),
    6,
  );
  TestValidator.equals("week one timelog count", weekOneRow.timelog_count, 3);
  TestValidator.equals("week one employee count", weekOneRow.employee_count, 1);
  TestValidator.equals(
    "week one total logged hours",
    weekOneRow.total_logged_hours,
    expectedWeekOneHours,
  );
  TestValidator.equals("week two timelog count", weekTwoRow.timelog_count, 2);
  TestValidator.equals("week two employee count", weekTwoRow.employee_count, 1);
  TestValidator.equals(
    "week two total logged hours",
    weekTwoRow.total_logged_hours,
    expectedWeekTwoHours,
  );
  TestValidator.predicate(
    "out of range total excluded",
    weekOneRow.total_logged_hours + weekTwoRow.total_logged_hours <
      expectedWeekOneHours + expectedWeekTwoHours + 10,
  );
}
