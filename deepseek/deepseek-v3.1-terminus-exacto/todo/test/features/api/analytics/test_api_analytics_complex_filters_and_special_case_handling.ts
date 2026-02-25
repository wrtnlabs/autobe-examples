import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_analytics_complex_filters_and_special_case_handling(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Test 1: Date range spanning multiple months
  // Create dates for filtering
  const startDate = new Date(
    Date.now() - 90 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 90 days ago
  const endDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
  // Execute date range query
  const dateRangeResult = await api.functional.todoApp.user.analytics(
    userConnection,
    {
      body: {
        start_date: startDate satisfies string & tags.Format<"date-time">,
        end_date: endDate satisfies string & tags.Format<"date-time">,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: 50 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      } satisfies ITodoAppAuditLog.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  // Validate pagination structure
  TestValidator.predicate(
    "date range result has valid pagination",
    () =>
      dateRangeResult.pagination.current >= 1 &&
      dateRangeResult.pagination.limit === 50 &&
      dateRangeResult.pagination.pages >= 0 &&
      dateRangeResult.pagination.records >= 0,
  );
  // Test 2: Combined event_type and event_subtype filters
  const eventTypeResult = await api.functional.todoApp.user.analytics(
    userConnection,
    {
      body: {
        event_type: "data_modification",
        event_subtype: "create_todo",
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: 10 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      } satisfies ITodoAppAuditLog.IRequest,
    },
  );
  typia.assert(eventTypeResult);
  // All returned records should match both filters
  for (const record of eventTypeResult.data) {
    TestValidator.equals(
      "event_type matches filter",
      record.event_type,
      "data_modification",
    );
    if (record.event_subtype !== null && record.event_subtype !== undefined) {
      TestValidator.equals(
        "event_subtype matches filter",
        record.event_subtype,
        "create_todo",
      );
    }
  }
  // Test 3: Filtering with start_date but no end_date
  const startDateOnlyResult = await api.functional.todoApp.user.analytics(
    userConnection,
    {
      body: {
        start_date: startDate satisfies string & tags.Format<"date-time">,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: 20 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      } satisfies ITodoAppAuditLog.IRequest,
    },
  );
  typia.assert(startDateOnlyResult);
  // Test 4: Filtering with end_date but no start_date
  const endDateOnlyResult = await api.functional.todoApp.user.analytics(
    userConnection,
    {
      body: {
        end_date: endDate satisfies string & tags.Format<"date-time">,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: 20 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      } satisfies ITodoAppAuditLog.IRequest,
    },
  );
  typia.assert(endDateOnlyResult);
  // Test 5: Very small limit (1 record per page) to test pagination edge cases
  const smallLimitResult = await api.functional.todoApp.user.analytics(
    userConnection,
    {
      body: {
        limit: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      } satisfies ITodoAppAuditLog.IRequest,
    },
  );
  typia.assert(smallLimitResult);
  // Validate limit=1 produces at most 1 record per page
  TestValidator.predicate(
    "limit=1 returns at most 1 record",
    smallLimitResult.data.length <= 1,
  );
  // If there are records, pagination should be valid
  if (smallLimitResult.pagination.records > 0) {
    TestValidator.equals(
      "current page is 1",
      smallLimitResult.pagination.current,
      1,
    );
    TestValidator.equals("limit is 1", smallLimitResult.pagination.limit, 1);
  }
  // Test 6: Page number beyond available data (should return empty page)
  const largePageResult = await api.functional.todoApp.user.analytics(
    userConnection,
    {
      body: {
        page: (smallLimitResult.pagination.pages + 10) satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        limit: 10 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      } satisfies ITodoAppAuditLog.IRequest,
    },
  );
  typia.assert(largePageResult);
  // Page beyond total pages should return empty data array
  TestValidator.equals(
    "page beyond total returns empty data",
    largePageResult.data.length,
    0,
  );
  // Total records should still be accurate
  TestValidator.equals(
    "total records consistent across queries",
    largePageResult.pagination.records,
    smallLimitResult.pagination.records,
  );
  // Test 7: Combined filters with logical AND behavior
  const combinedFiltersResult = await api.functional.todoApp.user.analytics(
    userConnection,
    {
      body: {
        event_type: "authentication",
        start_date: startDate satisfies string & tags.Format<"date-time">,
        end_date: endDate satisfies string & tags.Format<"date-time">,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: 15 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      } satisfies ITodoAppAuditLog.IRequest,
    },
  );
  typia.assert(combinedFiltersResult);
  // Verify logical AND: all records should match ALL filters
  for (const record of combinedFiltersResult.data) {
    TestValidator.equals(
      "event_type matches in combined filter",
      record.event_type,
      "authentication",
    );
    // Check date is within range (inclusive boundaries)
    const recordDate = new Date(record.created_at);
    const start = new Date(startDate);
    const end = new Date(endDate);
    TestValidator.predicate(
      "record date within inclusive range",
      recordDate >= start && recordDate <= end,
    );
  }
  // Test 8: Empty filters (should return all data with pagination)
  const emptyFiltersResult = await api.functional.todoApp.user.analytics(
    userConnection,
    {
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: 100 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      } satisfies ITodoAppAuditLog.IRequest,
    },
  );
  typia.assert(emptyFiltersResult);
  // Validate pagination calculations
  if (emptyFiltersResult.pagination.records > 0) {
    const calculatedPages = Math.ceil(
      emptyFiltersResult.pagination.records /
        emptyFiltersResult.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation is correct",
      emptyFiltersResult.pagination.pages,
      calculatedPages,
    );
  }
}
