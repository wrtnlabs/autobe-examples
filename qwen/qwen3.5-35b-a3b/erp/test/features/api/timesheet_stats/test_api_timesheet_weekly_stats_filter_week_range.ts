import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTimesheetWeeklyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetWeeklyStat";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimesheetWeeklyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheetWeeklyStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_weekly_stats_filter_week_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and organization via join
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: "USD",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Define 3 week ranges for testing
  const week1Start = new Date("2024-01-01T00:00:00Z").toISOString();
  const week1End = new Date("2024-01-07T23:59:59Z").toISOString();
  const week2Start = new Date("2024-02-01T00:00:00Z").toISOString();
  const week2End = new Date("2024-02-07T23:59:59Z").toISOString();
  const week3Start = new Date("2024-03-01T00:00:00Z").toISOString();
  const week3End = new Date("2024-03-07T23:59:59Z").toISOString();
  // 3. Create API connection with authentication
  const apiConnection: api.IConnection = { host: connection.host };
  apiConnection.headers = {
    ...memberConnection.headers,
    Authorization: joinResult.token.access,
  };
  // Test 1: Combined filter (gte and lte) - should return weeks within range
  const combinedFilter: IHrmPlatformTimesheetWeeklyStat.IRequest = {
    week_start: {
      gte: week2Start,
      lte: week3Start,
    },
    limit: 100,
  } satisfies IHrmPlatformTimesheetWeeklyStat.IRequest;
  const combinedResponse =
    await api.functional.hrmPlatform.member.timesheet_weekly_stats.index(
      apiConnection,
      { body: combinedFilter },
    );
  typia.assert(combinedResponse);
  // Validate: all results should be within gte and lte range
  for (const stat of combinedResponse.data) {
    TestValidator.predicate(
      "week_start within gte and lte range",
      stat.week_start >= week2Start && stat.week_start <= week3Start,
    );
  }
  // Test 2: gte filter only - should return weeks starting from week2Start
  const gteFilter: IHrmPlatformTimesheetWeeklyStat.IRequest = {
    week_start: {
      gte: week2Start,
    },
    limit: 100,
  } satisfies IHrmPlatformTimesheetWeeklyStat.IRequest;
  const gteResponse =
    await api.functional.hrmPlatform.member.timesheet_weekly_stats.index(
      apiConnection,
      { body: gteFilter },
    );
  typia.assert(gteResponse);
  // Validate: all results should be >= week2Start
  for (const stat of gteResponse.data) {
    TestValidator.predicate(
      "week_start >= gte value",
      stat.week_start >= week2Start,
    );
  }
  // Test 3: lte filter only - should return weeks starting on or before week3Start
  const lteFilter: IHrmPlatformTimesheetWeeklyStat.IRequest = {
    week_start: {
      lte: week3Start,
    },
    limit: 100,
  } satisfies IHrmPlatformTimesheetWeeklyStat.IRequest;
  const lteResponse =
    await api.functional.hrmPlatform.member.timesheet_weekly_stats.index(
      apiConnection,
      { body: lteFilter },
    );
  typia.assert(lteResponse);
  // Validate: all results should be <= week3Start
  for (const stat of lteResponse.data) {
    TestValidator.predicate(
      "week_start <= lte value",
      stat.week_start <= week3Start,
    );
  }
  // Test 4: Empty filter (no week_start) - should return all weeks
  const emptyFilter: IHrmPlatformTimesheetWeeklyStat.IRequest = {
    limit: 100,
  } satisfies IHrmPlatformTimesheetWeeklyStat.IRequest;
  const emptyResponse =
    await api.functional.hrmPlatform.member.timesheet_weekly_stats.index(
      apiConnection,
      { body: emptyFilter },
    );
  typia.assert(emptyResponse);
  // Validate: empty filter should return more or equal records than combined filter
  TestValidator.predicate(
    "empty filter returns >= records than combined filter",
    emptyResponse.pagination.records >= combinedResponse.pagination.records,
  );
  // Test 5: Pagination with page/limit (offset-based)
  const paginationFilter: IHrmPlatformTimesheetWeeklyStat.IRequest = {
    week_start: {
      gte: week2Start,
    },
    limit: 2,
    page: 1,
  } satisfies IHrmPlatformTimesheetWeeklyStat.IRequest;
  const firstPageResponse =
    await api.functional.hrmPlatform.member.timesheet_weekly_stats.index(
      apiConnection,
      { body: paginationFilter },
    );
  typia.assert(firstPageResponse);
  // Validate: first page has correct pagination metadata
  TestValidator.equals(
    "first page current",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit",
    firstPageResponse.pagination.limit,
    2,
  );
  // Validate: pagination metadata reflects filtered results
  TestValidator.equals(
    "filtered pagination records matches filtered data count",
    firstPageResponse.pagination.records,
    combinedResponse.pagination.records,
  );
  // Get second page using page=2
  const secondPageFilter: IHrmPlatformTimesheetWeeklyStat.IRequest = {
    week_start: {
      gte: week2Start,
    },
    limit: 2,
    page: 2,
  } satisfies IHrmPlatformTimesheetWeeklyStat.IRequest;
  const secondPageResponse =
    await api.functional.hrmPlatform.member.timesheet_weekly_stats.index(
      apiConnection,
      { body: secondPageFilter },
    );
  typia.assert(secondPageResponse);
  // Validate: second page current should be 2
  TestValidator.equals(
    "second page current",
    secondPageResponse.pagination.current,
    2,
  );
  // Validate: total records should be same as first page (filtered total)
  TestValidator.equals(
    "second page records same as first page",
    secondPageResponse.pagination.records,
    firstPageResponse.pagination.records,
  );
  // Test 6: Verify results are sorted by week_start DESC by default
  const sortFilter: IHrmPlatformTimesheetWeeklyStat.IRequest = {
    week_start: {
      gte: week2Start,
    },
    limit: 100,
    sort: "week_start",
    order: "DESC",
  } satisfies IHrmPlatformTimesheetWeeklyStat.IRequest;
  const sortResponse =
    await api.functional.hrmPlatform.member.timesheet_weekly_stats.index(
      apiConnection,
      { body: sortFilter },
    );
  typia.assert(sortResponse);
  // Validate: results should be sorted descending by week_start
  for (let i = 1; i < sortResponse.data.length; i++) {
    TestValidator.predicate(
      "results sorted DESC by week_start",
      sortResponse.data[i - 1].week_start >= sortResponse.data[i].week_start,
    );
  }
  // Test 7: Verify total records count matches only filtered results
  TestValidator.equals(
    "total records matches filtered count",
    combinedResponse.pagination.records,
    combinedResponse.data.length,
  );
}
