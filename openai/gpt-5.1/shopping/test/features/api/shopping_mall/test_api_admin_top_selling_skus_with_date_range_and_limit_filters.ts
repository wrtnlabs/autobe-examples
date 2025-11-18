import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogTopSellingSkuStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogTopSellingSkuStatistics";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Validate admin top-selling SKU statistics with date range and limit filters.
 *
 * Business goals:
 *
 * - Ensure that the admin analytics endpoint for top-selling SKUs accepts
 *   date-range filters and an optional limit and applies them correctly.
 * - Confirm structural correctness and ranking semantics of
 *   IShoppingMallCatalogTopSellingSkuStatistics and nested IItem objects.
 * - Validate that applying a smaller limit is equivalent to taking the prefix of
 *   the results from a larger (or unbounded) call with identical filters.
 *
 * Test flow:
 *
 * 1. Register an admin via POST /auth/admin/join, which also establishes an
 *    authenticated admin context via the SDK-managed Authorization header.
 * 2. Build a first request body for PATCH
 *    /shoppingMall/admin/catalog/statistics/topSellingSkus using
 *    IShoppingMallCatalogTopSellingSkuStatistics.IRequest with:
 *
 *    - StartDate: now minus 30 days (ISO 8601 string).
 *    - EndDate: now (ISO 8601 string).
 *    - Limit: small int32 value such as 5.
 *    - PeriodPreset, sellerId, categoryId omitted (undefined).
 * 3. Call the endpoint with this body and validate:
 *
 *    - Response shape via typia.assert.
 *    - Items.length <= requested limit.
 *    - For non-empty items array:
 *
 *         - All items have monotonically increasing rank starting at 1 with no gaps or
 *                   duplicates.
 *         - Items are ordered by ascending rank.
 * 4. Build a second request body using the same startDate/endDate but with a
 *    larger limit (e.g., double the first limit).
 * 5. Call the endpoint again and validate:
 *
 *    - Response shape via typia.assert.
 *    - Ranking invariants (1..N, sorted by rank) for the second result.
 *    - If the first result had at least one item and the second result has at least
 *         as many items:
 *
 *         - The first N items of the second result (where N = first items.length)
 *                   deep-equal the first result items (prefix consistency).
 *
 * The test avoids status-code-specific checks and type-error scenarios; it
 * assumes successful calls imply 2xx responses and focuses on business logic
 * and structural correctness.
 */
export async function test_api_admin_top_selling_skus_with_date_range_and_limit_filters(
  connection: api.IConnection,
) {
  // 1. Register an admin and establish authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare first statistics request body with explicit date range and limit
  const now = new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const startDate = new Date(now.getTime() - thirtyDaysMs).toISOString();
  const endDate = now.toISOString();

  const firstLimit = 5;

  const firstRequestBody = {
    startDate,
    endDate,
    limit: firstLimit,
  } satisfies IShoppingMallCatalogTopSellingSkuStatistics.IRequest;

  const firstStats: IShoppingMallCatalogTopSellingSkuStatistics =
    await api.functional.shoppingMall.admin.catalog.statistics.topSellingSkus.index(
      connection,
      { body: firstRequestBody },
    );
  typia.assert<IShoppingMallCatalogTopSellingSkuStatistics>(firstStats);

  const firstItems = firstStats.items;

  // Validate items length vs limit
  TestValidator.predicate(
    "first result items length should be <= requested limit",
    firstItems.length <= firstLimit,
  );

  // Helper to validate ranking invariants for a list of items
  const validateRanking = (
    titlePrefix: string,
    items: IShoppingMallCatalogTopSellingSkuStatistics.IItem[],
  ) => {
    if (items.length === 0) return;

    const ranks = items.map((it) => it.rank);

    // Ensure ranks start at 1
    TestValidator.equals(`${titlePrefix}: first rank should be 1`, ranks[0], 1);

    // Ensure monotonic +1 increments and sorted by rank
    for (let i = 1; i < ranks.length; i++) {
      TestValidator.equals(
        `${titlePrefix}: rank should increase by 1 at index ${i}`,
        ranks[i],
        ranks[i - 1] + 1,
      );
    }

    // Ensure items are sorted by rank ascending (no gaps/duplicates)
    const sortedRanks = [...ranks].sort((a, b) => a - b);
    TestValidator.equals(
      `${titlePrefix}: ranks should be sorted ascending without gaps`,
      ranks,
      sortedRanks,
    );
  };

  validateRanking("first call", firstItems);

  // 3. Prepare second request body with same dates but larger limit
  const secondLimit = firstLimit * 2;

  const secondRequestBody = {
    startDate,
    endDate,
    limit: secondLimit,
  } satisfies IShoppingMallCatalogTopSellingSkuStatistics.IRequest;

  const secondStats: IShoppingMallCatalogTopSellingSkuStatistics =
    await api.functional.shoppingMall.admin.catalog.statistics.topSellingSkus.index(
      connection,
      { body: secondRequestBody },
    );
  typia.assert<IShoppingMallCatalogTopSellingSkuStatistics>(secondStats);

  const secondItems = secondStats.items;

  // Validate ranking invariants for second call
  validateRanking("second call", secondItems);

  // 4. Prefix consistency check when we have enough data
  if (firstItems.length > 0 && secondItems.length >= firstItems.length) {
    const secondPrefix = secondItems.slice(0, firstItems.length);
    TestValidator.equals(
      "prefix consistency between limited and larger results",
      secondPrefix,
      firstItems,
    );
  }
}
