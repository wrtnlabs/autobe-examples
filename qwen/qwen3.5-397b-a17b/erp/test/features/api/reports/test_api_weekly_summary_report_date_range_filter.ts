import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformWeeklySummaryReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformWeeklySummaryReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

export async function test_api_weekly_summary_report_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization with Asia/Seoul timezone
  const org = await generate_random_hrm_platform_member_organizations_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscal_start_month: 1,
      } satisfies IHrmPlatformOrganization.ICreate,
    },
  );
  typia.assert(org);
  // 3. Create project (before employee since we need project for timelogs)
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#3498db",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 4. Create timelogs on specific dates within a known week
  // Use dates relative to current time to ensure they work in test environment
  const now = new Date();
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Get Monday of current week
  currentMonday.setHours(0, 0, 0, 0);
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: currentMonday.toISOString(),
        duration_minutes: 480, // 8 hours
        description: "Test work day 1",
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog1);
  const tuesdayDate = new Date(currentMonday);
  tuesdayDate.setDate(tuesdayDate.getDate() + 1);
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: tuesdayDate.toISOString(),
        duration_minutes: 360, // 6 hours
        description: "Test work day 2",
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog2);
  const wednesdayDate = new Date(currentMonday);
  wednesdayDate.setDate(wednesdayDate.getDate() + 2);
  const timelog3 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: wednesdayDate.toISOString(),
        duration_minutes: 420, // 7 hours
        description: "Test work day 3",
        billable: false,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog3);
  // Calculate week boundaries for assertions
  const weekStart = new Date(currentMonday);
  const weekEnd = new Date(currentMonday);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  // 5. Test scenario 1: Date range with NO timelogs (future dates)
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  const futureMonthEnd = new Date(futureDate);
  futureMonthEnd.setMonth(futureMonthEnd.getMonth() + 1);
  const futureReport =
    await api.functional.hrmPlatform.member.reports.weekly_summary.search(
      memberConnection,
      {
        body: {
          from_date: futureDate.toISOString(),
          to_date: futureMonthEnd.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(futureReport);
  TestValidator.equals(
    "future date range returns empty data",
    futureReport.data.length,
    0,
  );
  TestValidator.equals(
    "future date range records count",
    futureReport.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date range pages count",
    futureReport.pagination.pages,
    0,
  );
  TestValidator.equals(
    "future date range current page",
    futureReport.pagination.current,
    1,
  );
  // 6. Test scenario 2: Date range containing existing timelogs
  const weekBefore = new Date(currentMonday);
  weekBefore.setDate(weekBefore.getDate() - 7);
  const weekAfter = new Date(weekEnd);
  weekAfter.setDate(weekAfter.getDate() + 7);
  const validRangeReport =
    await api.functional.hrmPlatform.member.reports.weekly_summary.search(
      memberConnection,
      {
        body: {
          from_date: weekBefore.toISOString(),
          to_date: weekAfter.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(validRangeReport);
  TestValidator.predicate(
    "valid date range returns at least one week",
    () => validRangeReport.data.length >= 1,
  );
  TestValidator.predicate("valid date range has correct total hours", () => {
    const targetWeek = validRangeReport.data.find((week) => {
      const weekStartMatch = new Date(week.weekStart);
      return (
        weekStartMatch.getTime() >= currentMonday.getTime() &&
        weekStartMatch.getTime() <= weekEnd.getTime()
      );
    });
    if (!targetWeek) return false;
    // 480 + 360 + 420 = 1260 minutes = 21 hours
    return Math.abs(targetWeek.totalHours - 21) < 0.01;
  });
  TestValidator.predicate("valid date range has correct timelog count", () => {
    const targetWeek = validRangeReport.data.find((week) => {
      const weekStartMatch = new Date(week.weekStart);
      return (
        weekStartMatch.getTime() >= currentMonday.getTime() &&
        weekStartMatch.getTime() <= weekEnd.getTime()
      );
    });
    if (!targetWeek) return false;
    return targetWeek.timelogCount === 3;
  });
  TestValidator.predicate("valid date range has correct employee count", () => {
    const targetWeek = validRangeReport.data.find((week) => {
      const weekStartMatch = new Date(week.weekStart);
      return (
        weekStartMatch.getTime() >= currentMonday.getTime() &&
        weekStartMatch.getTime() <= weekEnd.getTime()
      );
    });
    if (!targetWeek) return false;
    return targetWeek.employeeCount === 1;
  });
  // 7. Test scenario 3: Date range before any timelogs (past dates)
  const pastDate = new Date();
  pastDate.setFullYear(pastDate.getFullYear() - 1);
  const pastMonthEnd = new Date(pastDate);
  pastMonthEnd.setMonth(pastMonthEnd.getMonth() + 1);
  const pastReport =
    await api.functional.hrmPlatform.member.reports.weekly_summary.search(
      memberConnection,
      {
        body: {
          from_date: pastDate.toISOString(),
          to_date: pastMonthEnd.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(pastReport);
  TestValidator.equals(
    "past date range returns empty data",
    pastReport.data.length,
    0,
  );
  TestValidator.equals(
    "past date range records count",
    pastReport.pagination.records,
    0,
  );
  // 8. Test pagination with limit
  const paginatedReport =
    await api.functional.hrmPlatform.member.reports.weekly_summary.search(
      memberConnection,
      {
        body: {
          from_date: weekBefore.toISOString(),
          to_date: weekAfter.toISOString(),
          page: 1,
          limit: 1,
        } satisfies IHrmPlatformWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(paginatedReport);
  TestValidator.predicate(
    "pagination limit respected",
    () => paginatedReport.data.length <= 1,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginatedReport.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 1",
    paginatedReport.pagination.limit,
    1,
  );
  // 9. Test week boundary fields in response
  const boundaryReport =
    await api.functional.hrmPlatform.member.reports.weekly_summary.search(
      memberConnection,
      {
        body: {
          from_date: currentMonday.toISOString(),
          to_date: weekEnd.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(boundaryReport);
  TestValidator.predicate("week boundary data is present", () => {
    if (boundaryReport.data.length === 0) return false;
    const week = boundaryReport.data[0];
    return (
      typeof week.weekStart === "string" &&
      typeof week.weekEnd === "string" &&
      typeof week.totalHours === "number" &&
      typeof week.timelogCount === "number" &&
      typeof week.employeeCount === "number"
    );
  });
}
