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
 * Test seller earnings statistics with top-performing sellers ranking.
 *
 * This test validates the seller earnings statistics endpoint's ability to
 * return a ranked list of top-performing sellers when the include_top_sellers
 * flag is enabled. It verifies that:
 *
 * 1. Admin can authenticate and access the statistics endpoint
 * 2. The response includes top_earning_sellers array when requested
 * 3. Each seller summary contains all required financial metrics
 * 4. Sellers are properly ranked by earnings performance
 *
 * Business context: This functionality enables platform administrators to
 * identify and analyze the highest-earning sellers for business intelligence,
 * partnership opportunities, and platform growth strategies.
 */
export async function test_api_seller_earnings_statistics_top_sellers_ranking(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Request seller earnings statistics with top sellers ranking
  const topSellersLimit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >() satisfies number as number;

  const requestBody = {
    include_top_sellers: true,
    top_sellers_limit: topSellersLimit,
    aggregation_level: "monthly" as const,
  } satisfies IShoppingMallSellerEarningsStatistics.IRequest;

  const statistics: IShoppingMallSellerEarningsStatistics =
    await api.functional.shoppingMall.admin.statistics.seller_earnings.index(
      connection,
      { body: requestBody },
    );
  typia.assert(statistics);

  // Step 3: Validate top_earning_sellers array is present
  TestValidator.predicate(
    "top_earning_sellers array should be present in response",
    statistics.top_earning_sellers !== undefined,
  );

  // Step 4: Verify seller summaries structure and ranking
  if (
    statistics.top_earning_sellers &&
    statistics.top_earning_sellers.length > 0
  ) {
    // Validate each seller summary structure with typia.assert
    for (const seller of statistics.top_earning_sellers) {
      typia.assert<IShoppingMallSellerEarningsSummary>(seller);
    }

    // Step 5: Verify sellers are ranked by gross_revenue in descending order
    for (let i = 0; i < statistics.top_earning_sellers.length - 1; i++) {
      const currentSeller = statistics.top_earning_sellers[i];
      const nextSeller = statistics.top_earning_sellers[i + 1];

      TestValidator.predicate(
        `seller at position ${i} should have higher or equal gross_revenue than seller at position ${i + 1}`,
        currentSeller.gross_revenue >= nextSeller.gross_revenue,
      );
    }

    // Step 6: Verify the number of sellers doesn't exceed the requested limit
    TestValidator.predicate(
      "number of top sellers should not exceed requested limit",
      statistics.top_earning_sellers.length <= topSellersLimit,
    );
  }
}
