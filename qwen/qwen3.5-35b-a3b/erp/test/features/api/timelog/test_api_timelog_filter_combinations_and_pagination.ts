import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timelog_filter_combinations_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register test employee using utility function
  const employeeConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: "https://test.example.com/signup",
      referrer: "https://test.example.com",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authResult);
  // Create employee-specific connection with token
  const employeeAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authResult.token.access,
    },
  };
  // 2. Test pagination and date range filtering
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  // 3. Test 3.1: Get all timelogs (no filters) to establish baseline
  const allTimelogsResponse = await api.functional.hrms.member.timelogs.index(
    employeeAuthConnection,
    {
      body: {},
    },
  );
  typia.assert(allTimelogsResponse);
  // Verify pagination metadata is present
  TestValidator.predicate(
    "pagination metadata exists",
    allTimelogsResponse.pagination !== undefined,
  );
  // 4. Test 4.1: Date range filter - only today
  const todayTimelogsResponse = await api.functional.hrms.member.timelogs.index(
    employeeAuthConnection,
    {
      body: {
        date_range: {
          start_date: `${today}T00:00:00Z`,
          end_date: `${today}T23:59:59Z`,
        },
      },
    },
  );
  typia.assert(todayTimelogsResponse);
  // 5. Test 5.1: Date range filter - yesterday to tomorrow
  const multiDayRange = await api.functional.hrms.member.timelogs.index(
    employeeAuthConnection,
    {
      body: {
        date_range: {
          start_date: `${yesterday}T00:00:00Z`,
          end_date: `${tomorrow}T23:59:59Z`,
        },
      },
    },
  );
  typia.assert(multiDayRange);
  // 6. Test 6.1: Date range with no matching timelogs (far future)
  const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const noDateMatchFilter = await api.functional.hrms.member.timelogs.index(
    employeeAuthConnection,
    {
      body: {
        date_range: {
          start_date: `${farFuture}T00:00:00Z`,
          end_date: `${farFuture}T23:59:59Z`,
        },
      },
    },
  );
  typia.assert(noDateMatchFilter);
  TestValidator.equals(
    "no timelogs in far future date range",
    noDateMatchFilter.data.length,
    0,
  );
  // Verify pagination metadata for empty result
  TestValidator.equals(
    "pagination records for empty result",
    noDateMatchFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages for empty result",
    noDateMatchFilter.pagination.pages,
    0,
  );
  // 7. Test 7.1: Pagination with page 1, limit 10
  const page1Response = await api.functional.hrms.member.timelogs.index(
    employeeAuthConnection,
    {
      body: {
        limit: 10,
        page: 1,
      },
    },
  );
  typia.assert(page1Response);
  TestValidator.predicate(
    "page 1 has up to limit items",
    page1Response.data.length <= 10,
  );
  TestValidator.equals(
    "page 1 is current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit is 10",
    page1Response.pagination.limit,
    10,
  );
  // 8. Test 8.1: Pagination with page 2, limit 5
  const page2Response = await api.functional.hrms.member.timelogs.index(
    employeeAuthConnection,
    {
      body: {
        limit: 5,
        page: 2,
      },
    },
  );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 is current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit is 5", page2Response.pagination.limit, 5);
  // 9. Test 9.1: Verify pagination metadata consistency
  const totalRecords = page1Response.pagination.records;
  const totalPages = page1Response.pagination.pages;
  const calculatedPages =
    totalRecords > 0
      ? Math.ceil(totalRecords / page1Response.pagination.limit)
      : 0;
  TestValidator.equals(
    "calculated pages match reported pages",
    totalPages,
    calculatedPages,
  );
  // 10. Test 10.1: Verify pagination navigation flags
  if (totalPages > 1) {
    TestValidator.equals(
      "has next page is true",
      page1Response.pagination.current < totalPages,
      true,
    );
    TestValidator.equals(
      "has prev page is false",
      page1Response.pagination.current <= 1,
      true,
    );
  } else {
    TestValidator.equals(
      "has next page is false",
      page1Response.pagination.current >= totalPages,
      true,
    );
    TestValidator.equals(
      "has prev page is false",
      page1Response.pagination.current <= 1,
      true,
    );
  }
  // 11. Test 11.1: Combine date range with pagination
  const paginatedWithDateFilter =
    await api.functional.hrms.member.timelogs.index(employeeAuthConnection, {
      body: {
        date_range: {
          start_date: `${today}T00:00:00Z`,
          end_date: `${today}T23:59:59Z`,
        },
        limit: 5,
        page: 1,
      },
    });
  typia.assert(paginatedWithDateFilter);
  TestValidator.predicate(
    "paginated date-filtered result has up to limit items",
    paginatedWithDateFilter.data.length <= 5,
  );
  TestValidator.equals(
    "current page is 1",
    paginatedWithDateFilter.pagination.current,
    1,
  );
  // 12. Test 12.1: Verify timelog data structure
  if (allTimelogsResponse.data.length > 0) {
    const sampleTimelog = allTimelogsResponse.data[0];
    TestValidator.predicate(
      "timelog has group_id",
      sampleTimelog.group_id !== undefined,
    );
    TestValidator.predicate(
      "timelog has group_name",
      sampleTimelog.group_name !== undefined,
    );
    TestValidator.predicate(
      "timelog has total_hours",
      sampleTimelog.total_hours !== undefined,
    );
    TestValidator.predicate(
      "timelog has billable_hours",
      sampleTimelog.billable_hours !== undefined,
    );
    TestValidator.predicate(
      "timelog has non_billable_hours",
      sampleTimelog.non_billable_hours !== undefined,
    );
  }
}