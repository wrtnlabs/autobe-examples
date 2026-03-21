import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmWeeklySummary";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmWeeklySummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_weekly_summary_report_populated_data(
  connection: api.IConnection,
): Promise<void> {
  // Test the weekly summary report with populated time tracking data across multiple weeks.
  // Validates that a member with report viewing permissions can retrieve accurate weekly
  // aggregations showing total hours, timelog counts, and unique employee counts.
  // 1. Create member account (becomes organization owner with manager-level permissions)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create a project for time tracking
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create timelog entries across multiple weeks
  // Calculate dates for timelog entries spanning multiple weeks
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const oneWeekMs = 7 * oneDayMs;
  // Helper function to get Monday of the week containing a date
  const getMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };
  // Helper function to get Sunday of the week containing a date
  const getSunday = (date: Date): Date => {
    const monday = getMonday(date);
    return new Date(monday.getTime() + 6 * oneDayMs);
  };
  // Week 1 (current week) - 3 timelog entries
  const week1Monday = getMonday(now);
  const week1Date1 = new Date(week1Monday.getTime() + 1 * oneDayMs);
  const week1Date2 = new Date(week1Monday.getTime() + 3 * oneDayMs);
  const week1Date3 = new Date(week1Monday.getTime() + 5 * oneDayMs);
  // Week 2 (previous week) - 2 timelog entries
  const week2Monday = new Date(week1Monday.getTime() - oneWeekMs);
  const week2Date1 = new Date(week2Monday.getTime() + 2 * oneDayMs);
  const week2Date2 = new Date(week2Monday.getTime() + 4 * oneDayMs);
  // Week 3 (two weeks ago) - 1 timelog entry
  const week3Monday = new Date(week2Monday.getTime() - oneWeekMs);
  const week3Date1 = new Date(week3Monday.getTime() + 3 * oneDayMs);
  // Create timelog entries with tracked durations
  const week1Durations: number[] = [120, 180, 240]; // 2h, 3h, 4h = 9h total
  const week2Durations: number[] = [300, 150]; // 5h, 2.5h = 7.5h total
  const week3Durations: number[] = [480]; // 8h = 8h total
  // Create Week 1 timelogs
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: week1Date1.toISOString(),
        duration: week1Durations[0],
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: week1Date2.toISOString(),
        duration: week1Durations[1],
      },
    },
  );
  typia.assert(timelog2);
  const timelog3 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: week1Date3.toISOString(),
        duration: week1Durations[2],
      },
    },
  );
  typia.assert(timelog3);
  // Create Week 2 timelogs
  const timelog4 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: week2Date1.toISOString(),
        duration: week2Durations[0],
      },
    },
  );
  typia.assert(timelog4);
  const timelog5 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: week2Date2.toISOString(),
        duration: week2Durations[1],
      },
    },
  );
  typia.assert(timelog5);
  // Create Week 3 timelogs
  const timelog6 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: week3Date1.toISOString(),
        duration: week3Durations[0],
      },
    },
  );
  typia.assert(timelog6);
  // 4. Calculate expected values
  const week1TotalMinutes = week1Durations.reduce((a, b) => a + b, 0);
  const week2TotalMinutes = week2Durations.reduce((a, b) => a + b, 0);
  const week3TotalMinutes = week3Durations.reduce((a, b) => a + b, 0);
  const week1TotalHours = week1TotalMinutes / 60;
  const week2TotalHours = week2TotalMinutes / 60;
  const week3TotalHours = week3TotalMinutes / 60;
  // Format dates for comparison (YYYY-MM-DD)
  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };
  // 5. Call weekly summary endpoint with date range covering all weeks
  const fromDate = new Date(week3Monday.getTime() - oneDayMs);
  const toDate = new Date(week1Monday.getTime() + 7 * oneDayMs);
  const weeklySummary =
    await api.functional.erpHrm.member.reports.weekly_summary.index(
      memberConnection,
      {
        body: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        } satisfies IErpHrmWeeklySummary.IRequest,
      },
    );
  typia.assert(weeklySummary);
  // 6. Validate response structure
  TestValidator.predicate(
    "pagination exists",
    weeklySummary.pagination !== null && weeklySummary.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(weeklySummary.data),
  );
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "current page is valid",
    weeklySummary.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    weeklySummary.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "records count matches data length",
    weeklySummary.pagination.records === weeklySummary.data.length ||
      weeklySummary.pagination.records > 0,
  );
  TestValidator.predicate(
    "pages is valid",
    weeklySummary.pagination.pages >= 1,
  );
  // 8. Validate we have data for the weeks with timelogs
  TestValidator.predicate(
    "has weekly summary data",
    weeklySummary.data.length >= 3,
  );
  // 9. Validate week entries are sorted by week_start_date descending (most recent first)
  for (let i = 0; i < weeklySummary.data.length - 1; i++) {
    const current = weeklySummary.data[i];
    const next = weeklySummary.data[i + 1];
    const currentDate = new Date(current.week_start_date);
    const nextDate = new Date(next.week_start_date);
    TestValidator.predicate(
      `weeks are sorted descending: ${current.week_start_date} > ${next.week_start_date}`,
      currentDate.getTime() > nextDate.getTime(),
    );
  }
  // 10. Find our created week entries and validate their content
  const week1StartStr = formatDate(week1Monday);
  const week2StartStr = formatDate(week2Monday);
  const week3StartStr = formatDate(week3Monday);
  const week1Entry = weeklySummary.data.find(
    (w) => w.week_start_date === week1StartStr,
  );
  const week2Entry = weeklySummary.data.find(
    (w) => w.week_start_date === week2StartStr,
  );
  const week3Entry = weeklySummary.data.find(
    (w) => w.week_start_date === week3StartStr,
  );
  // Validate Week 1 entry
  TestValidator.predicate("week 1 entry exists", week1Entry !== undefined);
  if (week1Entry) {
    const week1EndStr = formatDate(getSunday(week1Monday));
    TestValidator.equals(
      "week 1 start date",
      week1Entry.week_start_date,
      week1StartStr,
    );
    TestValidator.equals(
      "week 1 end date",
      week1Entry.week_end_date,
      week1EndStr,
    );
    TestValidator.equals(
      "week 1 total hours",
      week1Entry.total_hours,
      week1TotalHours,
    );
    TestValidator.equals("week 1 timelog count", week1Entry.timelog_count, 3);
    TestValidator.equals("week 1 employee count", week1Entry.employee_count, 1);
  }
  // Validate Week 2 entry
  TestValidator.predicate("week 2 entry exists", week2Entry !== undefined);
  if (week2Entry) {
    const week2EndStr = formatDate(getSunday(week2Monday));
    TestValidator.equals(
      "week 2 start date",
      week2Entry.week_start_date,
      week2StartStr,
    );
    TestValidator.equals(
      "week 2 end date",
      week2Entry.week_end_date,
      week2EndStr,
    );
    TestValidator.equals(
      "week 2 total hours",
      week2Entry.total_hours,
      week2TotalHours,
    );
    TestValidator.equals("week 2 timelog count", week2Entry.timelog_count, 2);
    TestValidator.equals("week 2 employee count", week2Entry.employee_count, 1);
  }
  // Validate Week 3 entry
  TestValidator.predicate("week 3 entry exists", week3Entry !== undefined);
  if (week3Entry) {
    const week3EndStr = formatDate(getSunday(week3Monday));
    TestValidator.equals(
      "week 3 start date",
      week3Entry.week_start_date,
      week3StartStr,
    );
    TestValidator.equals(
      "week 3 end date",
      week3Entry.week_end_date,
      week3EndStr,
    );
    TestValidator.equals(
      "week 3 total hours",
      week3Entry.total_hours,
      week3TotalHours,
    );
    TestValidator.equals("week 3 timelog count", week3Entry.timelog_count, 1);
    TestValidator.equals("week 3 employee count", week3Entry.employee_count, 1);
  }
  // 11. Test project filter
  const filteredSummary =
    await api.functional.erpHrm.member.reports.weekly_summary.index(
      memberConnection,
      {
        body: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
          project_id: project.id,
        } satisfies IErpHrmWeeklySummary.IRequest,
      },
    );
  typia.assert(filteredSummary);
  // Filtered results should match unfiltered for our project
  TestValidator.equals(
    "filtered data length matches unfiltered",
    filteredSummary.data.length,
    weeklySummary.data.length,
  );
  // 12. Test pagination
  const pagedSummary =
    await api.functional.erpHrm.member.reports.weekly_summary.index(
      memberConnection,
      {
        body: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
          page: 1,
          limit: 2,
        } satisfies IErpHrmWeeklySummary.IRequest,
      },
    );
  typia.assert(pagedSummary);
  TestValidator.predicate(
    "paged data has at most 2 entries",
    pagedSummary.data.length <= 2,
  );
  TestValidator.equals(
    "paged current page",
    pagedSummary.pagination.current,
    1,
  );
  TestValidator.equals("paged limit", pagedSummary.pagination.limit, 2);
}
