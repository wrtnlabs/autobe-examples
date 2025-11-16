import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSellerEarningsStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarningsStatistics";
import type { IShoppingMallSellerEarningsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarningsSummary";
import type { IShoppingMallSellerEarningsTimeSeriesDataPoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarningsTimeSeriesDataPoint";

/**
 * Test seller earnings statistics with multiple filters applied simultaneously.
 *
 * This test validates the complex querying capabilities of the seller earnings
 * statistics endpoint by applying multiple filters in combination:
 *
 * - Multiple specific seller IDs for targeted analysis
 * - Payout status filter to narrow transaction states
 * - Date range filter for temporal boundaries
 * - Minimum transaction count threshold
 * - Top sellers limit with ranking
 *
 * The test ensures all filters correctly intersect to produce accurate metrics
 * for sophisticated business intelligence and financial forensics
 * requirements.
 */
export async function test_api_seller_earnings_statistics_combined_filters_complex(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      ip: undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Generate test seller IDs for filtering
  const sellerIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  // Step 3: Define date range for temporal filtering
  const now = new Date();
  const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const endDate = now;

  // Step 4: Request statistics with all filters combined
  const statisticsRequest = {
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    seller_ids: sellerIds,
    payout_status: "completed" as const,
    aggregation_level: "daily" as const,
    include_top_sellers: true,
    top_sellers_limit: 5,
    minimum_transaction_count: 10,
  } satisfies IShoppingMallSellerEarningsStatistics.IRequest;

  const statistics =
    await api.functional.shoppingMall.admin.statistics.seller_earnings.index(
      connection,
      {
        body: statisticsRequest,
      },
    );
  typia.assert(statistics);

  // Step 5: Validate time series data exists
  TestValidator.predicate(
    "time series data should be present",
    Array.isArray(statistics.time_series_data),
  );

  // Step 6: Validate each time series data point
  if (statistics.time_series_data.length > 0) {
    statistics.time_series_data.forEach((dataPoint, index) => {
      typia.assert(dataPoint);

      TestValidator.predicate(
        `time series point ${index} should have valid period timestamps`,
        new Date(dataPoint.period_start) <= new Date(dataPoint.period_end),
      );

      // Validate time series falls within requested date range
      const periodStart = new Date(dataPoint.period_start);
      const periodEnd = new Date(dataPoint.period_end);
      TestValidator.predicate(
        `time series point ${index} should fall within requested date range`,
        periodStart >= startDate && periodEnd <= endDate,
      );

      TestValidator.predicate(
        `time series point ${index} should have non-negative financial values`,
        dataPoint.gross_earnings >= 0 &&
          dataPoint.net_earnings >= 0 &&
          dataPoint.platform_commission >= 0 &&
          dataPoint.payout_amount >= 0,
      );

      TestValidator.predicate(
        `time series point ${index} should have non-negative counts`,
        dataPoint.transaction_count >= 0 && dataPoint.active_seller_count >= 0,
      );
    });
  }

  // Step 7: Validate top earning sellers if included
  if (statistics.top_earning_sellers) {
    TestValidator.predicate(
      "top earning sellers should respect the limit",
      statistics.top_earning_sellers.length <= 5,
    );

    statistics.top_earning_sellers.forEach((seller, index) => {
      typia.assert(seller);

      TestValidator.predicate(
        `seller ${index} should have non-negative revenue values`,
        seller.gross_revenue >= 0 &&
          seller.net_revenue >= 0 &&
          seller.platform_commissions >= 0,
      );

      TestValidator.predicate(
        `seller ${index} should have non-negative transaction count`,
        seller.transaction_count >= 0,
      );

      TestValidator.predicate(
        `seller ${index} net revenue should equal gross minus commissions`,
        Math.abs(
          seller.net_revenue -
            (seller.gross_revenue - seller.platform_commissions),
        ) < 0.01,
      );
    });

    // Step 8: Validate ranking order (descending by gross revenue)
    for (let i = 0; i < statistics.top_earning_sellers.length - 1; i++) {
      TestValidator.predicate(
        `seller at position ${i} should have higher or equal revenue than seller at position ${i + 1}`,
        statistics.top_earning_sellers[i].gross_revenue >=
          statistics.top_earning_sellers[i + 1].gross_revenue,
      );
    }
  }

  // Step 9: Validate financial consistency
  TestValidator.predicate(
    "net revenue should equal gross revenue minus platform commissions",
    Math.abs(
      statistics.total_net_revenue -
        (statistics.total_gross_revenue -
          statistics.total_platform_commissions),
    ) < 0.01,
  );

  TestValidator.predicate(
    "average commission rate should be between 0 and 100",
    statistics.average_commission_rate >= 0 &&
      statistics.average_commission_rate <= 100,
  );

  // Step 10: Validate seller count consistency
  if (sellerIds.length > 0) {
    TestValidator.predicate(
      "seller count should not exceed the number of filtered seller IDs",
      statistics.seller_count <= sellerIds.length,
    );
  }
}
