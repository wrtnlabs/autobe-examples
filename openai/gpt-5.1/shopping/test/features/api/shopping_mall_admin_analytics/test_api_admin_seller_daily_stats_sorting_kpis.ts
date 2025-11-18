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
 * Validate sorting of seller daily statistics by key KPIs for admin analytics.
 *
 * Business goal: Ensure that the admin analytics endpoint for seller daily
 * stats correctly applies sorting for different KPI columns while preserving
 * consistent pagination metadata.
 *
 * Steps:
 *
 * 1. Register an admin using /auth/admin/join to obtain an authorized context.
 * 2. Build a broad IShoppingMallSellerDailyStat.IRequest filter with a date range
 *    and no restrictive metric filters.
 * 3. Call PATCH /shoppingMall/admin/analytics/sellerDailyStats with sortBy =
 *    "seller_earnings_amount", sortDirection = "desc" and verify that the
 *    returned page is sorted by seller_earnings_amount descending.
 * 4. Call the same endpoint again with sortBy = "late_shipment_count",
 *    sortDirection = "asc" and verify ascending ordering by that field.
 * 5. Validate that pagination metadata (current, limit, records, pages) stays
 *    consistent between both calls.
 */
export async function test_api_admin_seller_daily_stats_sorting_kpis(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized context
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Build a base request payload for seller daily stats search
  const now = new Date();
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const baseRequest = {
    fromDate: from.toISOString(),
    toDate: now.toISOString(),
    page: 1,
    limit: 50,
  } satisfies IShoppingMallSellerDailyStat.IRequest;

  // 3. First call: sort by seller_earnings_amount desc
  const firstResponse: IPageIShoppingMallSellerDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerDailyStats.index(
      connection,
      {
        body: {
          ...baseRequest,
          sortBy: "seller_earnings_amount",
          sortDirection: "desc",
        } satisfies IShoppingMallSellerDailyStat.IRequest,
      },
    );
  typia.assert(firstResponse);

  const firstPage = firstResponse.pagination;
  const firstData = firstResponse.data;

  // Basic sanity checks for first call
  TestValidator.predicate(
    "first pagination current page is non-negative",
    () => firstPage.current >= 0,
  );
  TestValidator.predicate(
    "first pagination limit is non-negative",
    () => firstPage.limit >= 0,
  );

  if (firstData.length >= 2) {
    for (let i = 1; i < firstData.length; ++i) {
      const prev = firstData[i - 1];
      const curr = firstData[i];
      TestValidator.predicate(
        `seller_earnings_amount should be non-increasing at index ${i}`,
        () => prev.seller_earnings_amount >= curr.seller_earnings_amount,
      );
    }
  }

  // 4. Second call: sort by late_shipment_count asc with same filters
  const secondResponse: IPageIShoppingMallSellerDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerDailyStats.index(
      connection,
      {
        body: {
          ...baseRequest,
          sortBy: "late_shipment_count",
          sortDirection: "asc",
        } satisfies IShoppingMallSellerDailyStat.IRequest,
      },
    );
  typia.assert(secondResponse);

  const secondPage = secondResponse.pagination;
  const secondData = secondResponse.data;

  // 5. Check pagination metadata consistency between both calls
  TestValidator.equals(
    "pagination.current should be consistent across sort variants",
    firstPage.current,
    secondPage.current,
  );
  TestValidator.equals(
    "pagination.limit should be consistent across sort variants",
    firstPage.limit,
    secondPage.limit,
  );
  TestValidator.equals(
    "pagination.records should be consistent across sort variants",
    firstPage.records,
    secondPage.records,
  );
  TestValidator.equals(
    "pagination.pages should be consistent across sort variants",
    firstPage.pages,
    secondPage.pages,
  );

  // Sorting verification for second call
  if (secondData.length >= 2) {
    for (let i = 1; i < secondData.length; ++i) {
      const prev = secondData[i - 1];
      const curr = secondData[i];
      TestValidator.predicate(
        `late_shipment_count should be non-decreasing at index ${i}`,
        () => prev.late_shipment_count <= curr.late_shipment_count,
      );
    }
  }
}
