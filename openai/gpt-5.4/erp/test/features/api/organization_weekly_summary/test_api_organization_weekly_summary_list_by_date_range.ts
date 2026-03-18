import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOrganizationWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationWeeklySummary";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingOrganizationWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganizationWeeklySummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_organization_weekly_summary_list_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  const organizationConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const rangeStart: string = new Date("2024-01-01T00:00:00.000Z").toISOString();
  const rangeEnd: string = new Date("2024-12-31T23:59:59.999Z").toISOString();
  const rangeStartTime: number = new Date(rangeStart).getTime();
  const rangeEndTime: number = new Date(rangeEnd).getTime();
  const page: number = 1;
  const limit: number = 10;
  const ascendingRequest = {
    page,
    limit,
    weekStartDate: rangeStart,
    weekEndDate: rangeEnd,
    sort: "week_start_date_asc",
  } satisfies IHrmTimeTrackingOrganizationWeeklySummary.IRequest;
  const ascendingPage =
    await api.functional.hrmTimeTracking.organizationWeeklySummaries.index(
      organizationConnection,
      {
        body: ascendingRequest,
      },
    );
  typia.assert(ascendingPage);
  TestValidator.equals(
    "ascending response current page matches request",
    ascendingPage.pagination.current,
    page,
  );
  TestValidator.equals(
    "ascending response limit matches request",
    ascendingPage.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "ascending response data length does not exceed limit",
    ascendingPage.data.length <= limit,
  );
  TestValidator.predicate(
    "ascending pagination records is non-negative",
    ascendingPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "ascending pagination pages is non-negative",
    ascendingPage.pagination.pages >= 0,
  );
  for (const row of ascendingPage.data) {
    const rowWeekStartTime: number = new Date(row.week_start_date).getTime();
    const rowWeekEndTime: number = new Date(row.week_end_date).getTime();
    TestValidator.predicate(
      "ascending row week_start_date is within requested range",
      rowWeekStartTime >= rangeStartTime,
    );
    TestValidator.predicate(
      "ascending row week_end_date is within requested range",
      rowWeekEndTime <= rangeEndTime,
    );
    TestValidator.predicate(
      "ascending row week range is ordered",
      rowWeekStartTime <= rowWeekEndTime,
    );
    TestValidator.predicate(
      "ascending row total logged hours is non-negative",
      row.total_logged_hours >= 0,
    );
    TestValidator.predicate(
      "ascending row pending timesheet count is non-negative",
      row.pending_timesheet_count >= 0,
    );
    TestValidator.predicate(
      "ascending row active employee count is non-negative",
      row.active_employee_count >= 0,
    );
    TestValidator.predicate(
      "ascending row budget alert count is non-negative",
      row.budget_alert_count >= 0,
    );
  }
  for (let i = 1; i < ascendingPage.data.length; ++i) {
    TestValidator.predicate(
      "ascending rows are ordered by week_start_date ascending",
      new Date(ascendingPage.data[i - 1].week_start_date).getTime() <=
        new Date(ascendingPage.data[i].week_start_date).getTime(),
    );
  }
  if (ascendingPage.data.length > 0) {
    const firstOrganizationId: string = ascendingPage.data[0].organization.id;
    for (const row of ascendingPage.data) {
      TestValidator.equals(
        "ascending rows stay within one organization context",
        row.organization.id,
        firstOrganizationId,
      );
    }
  }
  const defaultSortRequest = {
    page,
    limit,
    weekStartDate: rangeStart,
    weekEndDate: rangeEnd,
  } satisfies IHrmTimeTrackingOrganizationWeeklySummary.IRequest;
  const defaultSortPage =
    await api.functional.hrmTimeTracking.organizationWeeklySummaries.index(
      organizationConnection,
      {
        body: defaultSortRequest,
      },
    );
  typia.assert(defaultSortPage);
  TestValidator.equals(
    "default sort response current page matches request",
    defaultSortPage.pagination.current,
    page,
  );
  TestValidator.equals(
    "default sort response limit matches request",
    defaultSortPage.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "default sort response data length does not exceed limit",
    defaultSortPage.data.length <= limit,
  );
  for (const row of defaultSortPage.data) {
    const rowWeekStartTime: number = new Date(row.week_start_date).getTime();
    const rowWeekEndTime: number = new Date(row.week_end_date).getTime();
    TestValidator.predicate(
      "default sort row week_start_date is within requested range",
      rowWeekStartTime >= rangeStartTime,
    );
    TestValidator.predicate(
      "default sort row week_end_date is within requested range",
      rowWeekEndTime <= rangeEndTime,
    );
    TestValidator.predicate(
      "default sort row week range is ordered",
      rowWeekStartTime <= rowWeekEndTime,
    );
    TestValidator.predicate(
      "default sort row total logged hours is non-negative",
      row.total_logged_hours >= 0,
    );
    TestValidator.predicate(
      "default sort row pending timesheet count is non-negative",
      row.pending_timesheet_count >= 0,
    );
    TestValidator.predicate(
      "default sort row active employee count is non-negative",
      row.active_employee_count >= 0,
    );
    TestValidator.predicate(
      "default sort row budget alert count is non-negative",
      row.budget_alert_count >= 0,
    );
  }
  for (let i = 1; i < defaultSortPage.data.length; ++i) {
    TestValidator.predicate(
      "default sort rows are ordered by week_start_date descending",
      new Date(defaultSortPage.data[i - 1].week_start_date).getTime() >=
        new Date(defaultSortPage.data[i].week_start_date).getTime(),
    );
  }
  if (defaultSortPage.data.length > 0) {
    const firstOrganizationId: string = defaultSortPage.data[0].organization.id;
    for (const row of defaultSortPage.data) {
      TestValidator.equals(
        "default sort rows stay within one organization context",
        row.organization.id,
        firstOrganizationId,
      );
    }
  }
  const emptyRequest = {
    page: 1,
    limit: 5,
    weekStartDate: new Date("2100-01-01T00:00:00.000Z").toISOString(),
    weekEndDate: new Date("2100-12-31T23:59:59.999Z").toISOString(),
  } satisfies IHrmTimeTrackingOrganizationWeeklySummary.IRequest;
  const emptyPage =
    await api.functional.hrmTimeTracking.organizationWeeklySummaries.index(
      organizationConnection,
      {
        body: emptyRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty response current page matches request",
    emptyPage.pagination.current,
    emptyRequest.page,
  );
  TestValidator.equals(
    "empty response limit matches request",
    emptyPage.pagination.limit,
    emptyRequest.limit,
  );
  TestValidator.equals(
    "empty response data is empty",
    emptyPage.data.length,
    0,
  );
  TestValidator.predicate(
    "empty response records is non-negative",
    emptyPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "empty response pages is non-negative",
    emptyPage.pagination.pages >= 0,
  );
}
