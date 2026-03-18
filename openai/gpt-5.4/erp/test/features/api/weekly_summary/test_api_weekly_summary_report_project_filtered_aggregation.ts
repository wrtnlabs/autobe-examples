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

export async function test_api_weekly_summary_report_project_filtered_aggregation(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string &
        tags.Format<"password">,
      href: "https://example.com/hrm/weekly-summary" satisfies string as string &
        tags.Format<"uri">,
      referrer: "https://example.com/hrm/dashboard" satisfies string as string &
        tags.Format<"uri">,
      ip: "127.0.0.1" satisfies string as string & tags.Format<"ipv4">,
    },
  });
  typia.assert(authorized);
  const includedProject =
    await generate_random_hrm_time_tracking_projects_create(
      employeeConnection,
      {
        body: {
          name: `included-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          color_code: "#11aaee",
          status: "active",
          budget_hours: 120,
          start_date: "2026-01-05T00:00:00.000Z" satisfies string as string &
            tags.Format<"date-time">,
          end_date: "2026-03-31T23:59:59.999Z" satisfies string as string &
            tags.Format<"date-time">,
        },
      },
    );
  typia.assert(includedProject);
  const excludedProject =
    await generate_random_hrm_time_tracking_projects_create(
      employeeConnection,
      {
        body: {
          name: `excluded-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          color_code: "#ee7733",
          status: "active",
          budget_hours: 140,
          start_date: "2026-01-05T00:00:00.000Z" satisfies string as string &
            tags.Format<"date-time">,
          end_date: "2026-03-31T23:59:59.999Z" satisfies string as string &
            tags.Format<"date-time">,
        },
      },
    );
  typia.assert(excludedProject);
  const includedWeekOneA =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: includedProject.id,
          workedOn: "2026-01-06T09:00:00.000Z" satisfies string as string &
            tags.Format<"date-time">,
          durationMinutes: 120,
          description: "included week 1 entry a",
          billable: true,
        },
      },
    );
  typia.assert(includedWeekOneA);
  const includedWeekOneB =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: includedProject.id,
          workedOn: "2026-01-08T13:00:00.000Z" satisfies string as string &
            tags.Format<"date-time">,
          durationMinutes: 60,
          description: "included week 1 entry b",
          billable: false,
        },
      },
    );
  typia.assert(includedWeekOneB);
  const excludedWeekOne =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: excludedProject.id,
          workedOn: "2026-01-07T10:00:00.000Z" satisfies string as string &
            tags.Format<"date-time">,
          durationMinutes: 180,
          description: "excluded week 1 entry",
          billable: true,
        },
      },
    );
  typia.assert(excludedWeekOne);
  const includedWeekTwo =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: includedProject.id,
          workedOn: "2026-01-14T09:30:00.000Z" satisfies string as string &
            tags.Format<"date-time">,
          durationMinutes: 90,
          description: "included week 2 entry",
          billable: true,
        },
      },
    );
  typia.assert(includedWeekTwo);
  const excludedWeekTwo =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: excludedProject.id,
          workedOn: "2026-01-16T15:00:00.000Z" satisfies string as string &
            tags.Format<"date-time">,
          durationMinutes: 150,
          description: "excluded week 2 entry",
          billable: false,
        },
      },
    );
  typia.assert(excludedWeekTwo);
  const startDate = "2026-01-05T00:00:00.000Z" satisfies string as string &
    tags.Format<"date-time">;
  const endDate = "2026-01-18T23:59:59.999Z" satisfies string as string &
    tags.Format<"date-time">;
  const unfiltered =
    await api.functional.hrmTimeTracking.employee.weeklySummaries.index(
      employeeConnection,
      {
        body: {
          startDate,
          endDate,
          page: 1,
          limit: 10,
          sort: "+week_start_date",
        },
      },
    );
  typia.assert(unfiltered);
  const filtered =
    await api.functional.hrmTimeTracking.employee.weeklySummaries.index(
      employeeConnection,
      {
        body: {
          startDate,
          endDate,
          projectId: includedProject.id,
          page: 1,
          limit: 10,
          sort: "+week_start_date",
        },
      },
    );
  typia.assert(filtered);
  TestValidator.equals("filtered weekly row count", filtered.data.length, 2);
  TestValidator.predicate(
    "unfiltered has at least as many weekly rows as filtered",
    unfiltered.data.length >= filtered.data.length,
  );
  TestValidator.equals(
    "filtered pagination current page",
    filtered.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered pagination limit",
    filtered.pagination.limit,
    10,
  );
  const expectedFilteredWeeks = [
    {
      week_start_date: "2026-01-05T00:00:00.000Z",
      total_logged_hours: 3,
      timelog_count: 2,
      employee_count: 1,
    },
    {
      week_start_date: "2026-01-12T00:00:00.000Z",
      total_logged_hours: 1.5,
      timelog_count: 1,
      employee_count: 1,
    },
  ] as const;
  expectedFilteredWeeks.forEach((expected, index) => {
    const row = filtered.data[index];
    const weekStart = new Date(row.week_start_date);
    const weekEnd = new Date(row.week_end_date);
    TestValidator.equals(
      `filtered week ${index} start boundary`,
      row.week_start_date,
      expected.week_start_date,
    );
    TestValidator.equals(
      `filtered week ${index} start is monday`,
      weekStart.getUTCDay(),
      1,
    );
    TestValidator.equals(
      `filtered week ${index} end is sunday`,
      weekEnd.getUTCDay(),
      0,
    );
    TestValidator.equals(
      `filtered week ${index} total hours`,
      row.total_logged_hours,
      expected.total_logged_hours,
    );
    TestValidator.equals(
      `filtered week ${index} timelog count`,
      row.timelog_count,
      expected.timelog_count,
    );
    TestValidator.equals(
      `filtered week ${index} employee count`,
      row.employee_count,
      expected.employee_count,
    );
  });
  const unfilteredWeekOne = unfiltered.data[0];
  const unfilteredWeekTwo = unfiltered.data[1];
  const filteredWeekOne = filtered.data[0];
  const filteredWeekTwo = filtered.data[1];
  TestValidator.equals(
    "week one rows share monday bucket",
    unfilteredWeekOne.week_start_date,
    filteredWeekOne.week_start_date,
  );
  TestValidator.equals(
    "week two rows share monday bucket",
    unfilteredWeekTwo.week_start_date,
    filteredWeekTwo.week_start_date,
  );
  TestValidator.predicate(
    "week one unfiltered totals exceed filtered totals",
    unfilteredWeekOne.total_logged_hours > filteredWeekOne.total_logged_hours &&
      unfilteredWeekOne.timelog_count > filteredWeekOne.timelog_count,
  );
  TestValidator.predicate(
    "week two unfiltered totals exceed filtered totals",
    unfilteredWeekTwo.total_logged_hours > filteredWeekTwo.total_logged_hours &&
      unfilteredWeekTwo.timelog_count > filteredWeekTwo.timelog_count,
  );
  TestValidator.equals(
    "week one filtered employee count remains single employee",
    filteredWeekOne.employee_count,
    1,
  );
  TestValidator.equals(
    "week two filtered employee count remains single employee",
    filteredWeekTwo.employee_count,
    1,
  );
}
