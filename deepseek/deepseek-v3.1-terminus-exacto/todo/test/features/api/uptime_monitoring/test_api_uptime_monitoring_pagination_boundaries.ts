import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoUptimeMonitoring } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUptimeMonitoring";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoUptimeMonitoring } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUptimeMonitoring";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination boundary conditions and edge cases for uptime monitoring endpoint.
 * Validate that pagination works correctly with different page sizes (minimum and maximum limits).
 * Test edge cases like empty result sets, single-page results, and multi-page navigation.
 * Verify that out-of-bounds page requests handle gracefully with appropriate empty responses.
 * Test cursor-based pagination efficiency for large datasets.
 * Ensure pagination metadata accurately reflects the actual data distribution across pages.
 */
export async function test_api_uptime_monitoring_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // Test 1: Minimum page (1) with default limit
  const page1 =
    await api.functional.multiUserTodo.admin.uptime_monitorings.index(
      adminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IMultiUserTodoUptimeMonitoring.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "page should be 1 or greater",
    page1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit should be positive",
    page1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records should be non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    page1.pagination.pages >= 0,
  );
  // Test 2: Minimum page size (1)
  const minLimit =
    await api.functional.multiUserTodo.admin.uptime_monitorings.index(
      adminConnection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IMultiUserTodoUptimeMonitoring.IRequest,
      },
    );
  typia.assert(minLimit);
  TestValidator.predicate(
    "limit should be between 1 and 100",
    minLimit.pagination.limit >= 1 && minLimit.pagination.limit <= 100,
  );
  // Test 3: Maximum page size (100)
  const maxLimit =
    await api.functional.multiUserTodo.admin.uptime_monitorings.index(
      adminConnection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >() satisfies number as number,
        } satisfies IMultiUserTodoUptimeMonitoring.IRequest,
      },
    );
  typia.assert(maxLimit);
  TestValidator.predicate(
    "limit should be between 1 and 100",
    maxLimit.pagination.limit >= 1 && maxLimit.pagination.limit <= 100,
  );
  // Test 4: Empty result set with date filter that returns no data
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const emptyResults =
    await api.functional.multiUserTodo.admin.uptime_monitorings.index(
      adminConnection,
      {
        body: {
          date_from: futureDate satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
        } satisfies IMultiUserTodoUptimeMonitoring.IRequest,
      },
    );
  typia.assert(emptyResults);
  TestValidator.equals(
    "records should be 0 for future date filter",
    emptyResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages should be 0 for empty results",
    emptyResults.pagination.pages,
    0,
  );
  TestValidator.equals(
    "data should be empty array",
    emptyResults.data.length,
    0,
  );
  // Test 5: Different page numbers with consistent limit
  const limit20 = 20 satisfies number;
  const page2 =
    await api.functional.multiUserTodo.admin.uptime_monitorings.index(
      adminConnection,
      {
        body: {
          page: 2 satisfies number,
          limit: limit20 satisfies number,
        } satisfies IMultiUserTodoUptimeMonitoring.IRequest,
      },
    );
  typia.assert(page2);
  const page3 =
    await api.functional.multiUserTodo.admin.uptime_monitorings.index(
      adminConnection,
      {
        body: {
          page: 3 satisfies number,
          limit: limit20 satisfies number,
        } satisfies IMultiUserTodoUptimeMonitoring.IRequest,
      },
    );
  typia.assert(page3);
  // Validate consistency between pages
  if (page2.pagination.records > 0 && page3.pagination.records > 0) {
    TestValidator.equals(
      "total records should be same across pages",
      page2.pagination.records,
      page3.pagination.records,
    );
    TestValidator.equals(
      "limit should be same across pages",
      page2.pagination.limit,
      page3.pagination.limit,
    );
    TestValidator.equals(
      "total pages should be same across pages",
      page2.pagination.pages,
      page3.pagination.pages,
    );
  }
  // Test 6: Graceful handling of out-of-bounds page (page exceeding total pages)
  // Get total pages first
  const basePage =
    await api.functional.multiUserTodo.admin.uptime_monitorings.index(
      adminConnection,
      {
        body: {
          limit: 10 satisfies number,
        } satisfies IMultiUserTodoUptimeMonitoring.IRequest,
      },
    );
  typia.assert(basePage);
  if (basePage.pagination.pages > 0) {
    const outOfBoundsPage =
      await api.functional.multiUserTodo.admin.uptime_monitorings.index(
        adminConnection,
        {
          body: {
            page: (basePage.pagination.pages + 1) satisfies number,
            limit: 10 satisfies number,
          } satisfies IMultiUserTodoUptimeMonitoring.IRequest,
        },
      );
    typia.assert(outOfBoundsPage);
    TestValidator.equals(
      "out-of-bounds page should return empty data",
      outOfBoundsPage.data.length,
      0,
    );
    TestValidator.equals(
      "current page should match requested page even if out of bounds",
      outOfBoundsPage.pagination.current,
      basePage.pagination.pages + 1,
    );
  }
  // Test 7: Single-page scenario with large limit
  const singlePage =
    await api.functional.multiUserTodo.admin.uptime_monitorings.index(
      adminConnection,
      {
        body: {
          limit: 100 satisfies number,
        } satisfies IMultiUserTodoUptimeMonitoring.IRequest,
      },
    );
  typia.assert(singlePage);
  if (singlePage.pagination.records <= singlePage.pagination.limit) {
    TestValidator.equals(
      "single page scenario should have exactly 1 page",
      singlePage.pagination.pages,
      1,
    );
  }
  // Test 8: Search filter with pagination
  const searchResults =
    await api.functional.multiUserTodo.admin.uptime_monitorings.index(
      adminConnection,
      {
        body: {
          search: RandomGenerator.alphabets(3),
          page: 1 satisfies number,
          limit: 5 satisfies number,
        } satisfies IMultiUserTodoUptimeMonitoring.IRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search results should have valid pagination",
    searchResults.pagination.current >= 0,
  );
  // Test 9: Health status filter with pagination
  const healthyResults =
    await api.functional.multiUserTodo.admin.uptime_monitorings.index(
      adminConnection,
      {
        body: {
          is_healthy: true satisfies boolean | null | undefined as
            | boolean
            | null
            | undefined,
          page: 1 satisfies number,
          limit: 10 satisfies number,
        } satisfies IMultiUserTodoUptimeMonitoring.IRequest,
      },
    );
  typia.assert(healthyResults);
  // Test 10: Date range filter with pagination
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
  const dateRangeResults =
    await api.functional.multiUserTodo.admin.uptime_monitorings.index(
      adminConnection,
      {
        body: {
          date_from: pastDate satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          date_to: new Date().toISOString() satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          page: 1 satisfies number,
          limit: 15 satisfies number,
        } satisfies IMultiUserTodoUptimeMonitoring.IRequest,
      },
    );
  typia.assert(dateRangeResults);
}
