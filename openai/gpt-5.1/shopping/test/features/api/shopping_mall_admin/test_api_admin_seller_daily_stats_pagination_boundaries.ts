import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerDailyStat";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDailyStat";

/**
 * Validate pagination boundary behavior for seller daily stats admin analytics.
 *
 * Business purpose: Ensure that the admin analytics search endpoint for seller
 * daily statistics correctly respects pagination boundaries for a logged-in
 * admin, especially when navigating to the last page and beyond. This is
 * important to guarantee that admin UIs built on top of this endpoint behave
 * predictably and do not encounter off-by-one errors or inconsistent pagination
 * metadata.
 *
 * Scenario steps:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authenticated admin
 *    context. The SDK will automatically inject the access token into the
 *    connection headers.
 * 2. Perform an initial search on PATCH
 *    /shoppingMall/admin/analytics/sellerDailyStats with a relatively small
 *    limit (e.g., 5) and a broad date range so that the analytics service can
 *    return multiple pages of data when historical snapshots exist.
 * 3. Capture pagination.records, pagination.limit, and pagination.pages from the
 *    first response. From these values, compute an expected lastPage index and
 *    ensure the values are mathematically consistent.
 * 4. Request the last page using the same filter criteria but page set to the
 *    computed lastPage. Validate that:
 *
 *    - Pagination.current reflects the requested (or clamped) page.
 *    - The data array length is:
 *
 *         - > 0 when records > 0.
 *         - <= limit.
 * 5. Request page = lastPage + 1 with identical filters to validate out-of-range
 *    behavior. The system may:
 *
 *    - Return an empty data array with pagination.current equal to the requested
 *         page and pages unchanged.
 *    - Or clamp pagination.current to the actual last page while keeping pages and
 *         records stable. The test must accept either behavior but must assert
 *         that:
 *    - Pagination.records is identical across calls.
 *    - Pagination.pages does not decrease.
 *    - No runtime or HTTP errors are thrown for the out-of-range page.
 * 6. When there are zero records (pagination.records === 0), the test must still
 *    behave safely. In that case, pages is expected to be 0 or 1 depending on
 *    implementation, and requesting higher pages should not cause failures. The
 *    test should focus on invariants: stable records and non-negative
 *    pages/current.
 */
export async function test_api_admin_seller_daily_stats_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // For simplicity, keep ip undefined to let backend derive it and
    // populate href/referrer with valid URIs.
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Initial stats search with small limit and broad date range.
  const now = new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - thirtyDaysMs).toISOString();
  const toDate = now.toISOString();
  const limit: number = 5;

  const initialRequest = {
    page: 1,
    limit,
    fromDate,
    toDate,
  } satisfies IShoppingMallSellerDailyStat.IRequest;

  const firstPage: IPageIShoppingMallSellerDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerDailyStats.index(
      connection,
      { body: initialRequest },
    );
  typia.assert(firstPage);

  const firstPagination = firstPage.pagination;
  const firstData = firstPage.data;

  // Basic invariants on first page
  TestValidator.predicate(
    "first page: current page should be >= 0",
    firstPagination.current >= 0,
  );
  TestValidator.predicate(
    "first page: limit should be > 0",
    firstPagination.limit > 0,
  );
  TestValidator.predicate(
    "first page: records non-negative",
    firstPagination.records >= 0,
  );
  TestValidator.predicate(
    "first page: pages non-negative",
    firstPagination.pages >= 0,
  );

  // When there are no records, we can still check that data is empty and
  // pagination is self-consistent, but we cannot perform last-page specific
  // assertions based on records > 0.
  if (firstPagination.records === 0) {
    TestValidator.equals(
      "first page: data must be empty when records is 0",
      firstData.length,
      0,
    );

    // Request a higher page (e.g., page 2) and ensure invariants hold.
    const emptyBeyondRequest = {
      page: 2,
      limit,
      fromDate,
      toDate,
    } satisfies IShoppingMallSellerDailyStat.IRequest;

    const emptyBeyondPage: IPageIShoppingMallSellerDailyStat.ISummary =
      await api.functional.shoppingMall.admin.analytics.sellerDailyStats.index(
        connection,
        { body: emptyBeyondRequest },
      );
    typia.assert(emptyBeyondPage);

    const emptyBeyondPagination = emptyBeyondPage.pagination;

    TestValidator.equals(
      "beyond page: records remain zero",
      emptyBeyondPagination.records,
      firstPagination.records,
    );
    TestValidator.predicate(
      "beyond page: pages non-negative",
      emptyBeyondPagination.pages >= 0,
    );
    TestValidator.equals(
      "beyond page: data must be empty when records is 0",
      emptyBeyondPage.data.length,
      0,
    );

    return;
  }

  // For records > 0, compute expected last page using ceiling.
  const records = firstPagination.records;
  const effectiveLimit = firstPagination.limit;
  const expectedPages =
    effectiveLimit === 0 ? 0 : Math.ceil(records / effectiveLimit);

  TestValidator.equals(
    "first page: pages matches computed ceiling(records / limit)",
    firstPagination.pages,
    expectedPages,
  );

  const lastPageIndex = expectedPages;

  // 3. Fetch the last page with same filters but page = lastPageIndex.
  const lastPageRequest = {
    page: lastPageIndex,
    limit,
    fromDate,
    toDate,
  } satisfies IShoppingMallSellerDailyStat.IRequest;

  const lastPage: IPageIShoppingMallSellerDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerDailyStats.index(
      connection,
      { body: lastPageRequest },
    );
  typia.assert(lastPage);

  const lastPagination = lastPage.pagination;
  const lastData = lastPage.data;

  // Invariants: records and pages must be stable across calls with same
  // filters.
  TestValidator.equals(
    "last page: records remain constant across calls",
    lastPagination.records,
    firstPagination.records,
  );
  TestValidator.equals(
    "last page: pages remain constant across calls",
    lastPagination.pages,
    firstPagination.pages,
  );

  TestValidator.predicate(
    "last page: current must be between 1 and pages (inclusive) when records > 0",
    lastPagination.current >= 1 &&
      lastPagination.current <= lastPagination.pages,
  );

  TestValidator.predicate(
    "last page: data length must be > 0 and <= limit when records > 0",
    lastData.length > 0 && lastData.length <= lastPagination.limit,
  );

  // 4. Request one page beyond the computed last page.
  const beyondPageIndex = lastPageIndex + 1;
  const beyondRequest = {
    page: beyondPageIndex,
    limit,
    fromDate,
    toDate,
  } satisfies IShoppingMallSellerDailyStat.IRequest;

  const beyondPage: IPageIShoppingMallSellerDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerDailyStats.index(
      connection,
      { body: beyondRequest },
    );
  typia.assert(beyondPage);

  const beyondPagination = beyondPage.pagination;
  const beyondData = beyondPage.data;

  // Records and pages must not regress.
  TestValidator.equals(
    "beyond page: records stay constant",
    beyondPagination.records,
    firstPagination.records,
  );
  TestValidator.equals(
    "beyond page: pages stay constant",
    beyondPagination.pages,
    firstPagination.pages,
  );

  // Accept either clamping or empty-page semantics but assert that pages
  // is respected.
  TestValidator.predicate(
    "beyond page: current is either clamped to last page or equals requested page",
    beyondPagination.current === lastPageIndex ||
      beyondPagination.current === beyondPageIndex,
  );

  // If page is clamped, we may still see data on the page. If not clamped
  // (current === requested page), then data should be empty when request is
  // beyond total pages.
  if (beyondPagination.current === beyondPageIndex) {
    TestValidator.equals(
      "beyond page: data should be empty when current equals requested page beyond last page",
      beyondData.length,
      0,
    );
  } else {
    // current clamped to last pageIndex; data constraints should look like a
    // normal page.
    TestValidator.predicate(
      "beyond page: clamped last page data length must be > 0 and <= limit",
      beyondData.length > 0 && beyondData.length <= beyondPagination.limit,
    );
  }
}
