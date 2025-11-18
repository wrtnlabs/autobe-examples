import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerFeeAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerFeeAnalytics";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerFeeAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerFeeAnalytics";
import type { IShoppingMallSellerFeeAnalyticsDailyTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerFeeAnalyticsDailyTrend";
import type { IShoppingMallSellerFeeAnalyticsFeeTypeBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerFeeAnalyticsFeeTypeBreakdown";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate seller fee analytics filtering by feeTypes and amount range.
 *
 * Business goal
 *
 * - Ensure that a seller can query fee analytics with specific fee type filters
 *   and amount thresholds, and that:
 *
 *   - The response structure matches pagination + analytics summary DTOs.
 *   - Fee_type_breakdowns fee_type values respect the requested feeTypes.
 *   - Changing feeTypes leads to different aggregates when data is present.
 *   - Invalid min/max combinations are rejected by the backend (business
 *       validation), without testing any TypeScript-level type errors.
 *
 * Test flow
 *
 * 1. Register a new seller via /auth/seller/join to obtain an authenticated
 *    connection context.
 * 2. Perform a first analytics query, filtering by a chosen fee type and min/max
 *    amount range.
 * 3. Validate response structure and basic consistency of aggregates.
 * 4. Perform a second analytics query with a different feeTypes filter but the
 *    same date window and amount range.
 * 5. When both queries return data, assert that result contents differ and that
 *    breakdown fee_type values respect their requested feeTypes sets.
 * 6. Exercise a minAmount > maxAmount scenario and expect a business error, still
 *    using correct numeric types.
 */
export async function test_api_seller_fee_analytics_filter_by_fee_type_and_amount(
  connection: api.IConnection,
) {
  // 1. Register a new seller and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Provide reasonable session metadata for join
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Prepare common analytics request parameters
  const now = new Date();
  const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
  const start = new Date(now.getTime() - oneMonthMs);
  const end = new Date(now.getTime() + oneMonthMs);

  const commonPage = 1 as number & tags.Type<"int32">;
  const commonPageSize = 20 as number & tags.Type<"int32">;

  const feeTypeA = "transaction_commission";
  const feeTypeB = "subscription_fee";

  const minAmount = 10;
  const maxAmount = 100000;

  const baseRequestA = {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    feeTypes: [feeTypeA],
    minAmount,
    maxAmount,
    groupBy: "fee_type",
    page: commonPage,
    pageSize: commonPageSize,
    sortBy: "total_fee_amount",
    sortDirection: "desc",
  } satisfies IShoppingMallSellerFeeAnalytics.IRequest;

  // 3. First analytics call with feeTypes = [feeTypeA]
  const pageA: IPageIShoppingMallSellerFeeAnalytics.ISummary =
    await api.functional.shoppingMall.seller.analytics.sellerFees.index(
      connection,
      {
        body: baseRequestA,
      },
    );
  typia.assert<IPageIShoppingMallSellerFeeAnalytics.ISummary>(pageA);

  // Basic pagination sanity checks
  const paginationA = pageA.pagination;
  TestValidator.predicate(
    "pagination current is non-negative",
    () => paginationA.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive or zero",
    () => paginationA.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => paginationA.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => paginationA.pages >= 0,
  );

  // Validate each analytics summary row for structural correctness
  for (const summary of pageA.data) {
    // seller summary structure
    typia.assert<IShoppingMallSeller.ISummary>(summary.seller);

    TestValidator.predicate(
      "currency is non-empty string",
      () => summary.currency.length > 0,
    );

    TestValidator.predicate("total_fee_amount is finite", () =>
      Number.isFinite(summary.total_fee_amount),
    );
    TestValidator.predicate("total_tax_amount is finite", () =>
      Number.isFinite(summary.total_tax_amount),
    );
    TestValidator.predicate("total_platform_revenue_amount is finite", () =>
      Number.isFinite(summary.total_platform_revenue_amount),
    );
    TestValidator.predicate(
      "total_non_revenue_pass_through_amount is finite",
      () => Number.isFinite(summary.total_non_revenue_pass_through_amount),
    );

    // fee_type_breakdowns structural checks
    for (const breakdown of summary.fee_type_breakdowns) {
      typia.assert<IShoppingMallSellerFeeAnalyticsFeeTypeBreakdown.ISummary>(
        breakdown,
      );

      // If breakdown matches requested fee type set, its fee_type should be in that set
      TestValidator.predicate(
        "breakdown fee_type belongs to requested set (A)",
        () => [feeTypeA].includes(breakdown.fee_type),
      );

      TestValidator.predicate("breakdown total_fee_amount is finite", () =>
        Number.isFinite(breakdown.total_fee_amount),
      );
      TestValidator.predicate("breakdown total_tax_amount is finite", () =>
        Number.isFinite(breakdown.total_tax_amount),
      );
      TestValidator.predicate(
        "breakdown platform_revenue_amount is finite",
        () => Number.isFinite(breakdown.platform_revenue_amount),
      );
      TestValidator.predicate(
        "breakdown non_revenue_pass_through_amount is finite",
        () => Number.isFinite(breakdown.non_revenue_pass_through_amount),
      );
    }

    // daily_trends structural checks
    for (const trend of summary.daily_trends) {
      typia.assert<IShoppingMallSellerFeeAnalyticsDailyTrend.ISummary>(trend);
      TestValidator.predicate("trend total_fee_amount is finite", () =>
        Number.isFinite(trend.total_fee_amount),
      );
      TestValidator.predicate("trend total_tax_amount is finite", () =>
        Number.isFinite(trend.total_tax_amount),
      );
      TestValidator.predicate("trend platform_revenue_amount is finite", () =>
        Number.isFinite(trend.platform_revenue_amount),
      );
      TestValidator.predicate(
        "trend non_revenue_pass_through_amount is finite",
        () => Number.isFinite(trend.non_revenue_pass_through_amount),
      );
    }
  }

  // 4. Second analytics call with different feeTypes filter (feeTypeB)
  const requestB = {
    ...baseRequestA,
    feeTypes: [feeTypeB],
  } satisfies IShoppingMallSellerFeeAnalytics.IRequest;

  const pageB: IPageIShoppingMallSellerFeeAnalytics.ISummary =
    await api.functional.shoppingMall.seller.analytics.sellerFees.index(
      connection,
      {
        body: requestB,
      },
    );
  typia.assert<IPageIShoppingMallSellerFeeAnalytics.ISummary>(pageB);

  // Verify breakdown fee_type values respect new requested set when data is present
  for (const summary of pageB.data) {
    for (const breakdown of summary.fee_type_breakdowns) {
      TestValidator.predicate(
        "breakdown fee_type belongs to requested set (B)",
        () => [feeTypeB].includes(breakdown.fee_type),
      );
    }
  }

  // 5. When both responses contain data, compare that results differ
  if (pageA.data.length > 0 && pageB.data.length > 0) {
    TestValidator.notEquals(
      "analytics results should differ between fee type filters",
      pageA.data,
      pageB.data,
    );
  }

  // 6. Negative-flow business validation: minAmount > maxAmount should error
  const invalidRangeRequest = {
    ...baseRequestA,
    minAmount: maxAmount + 100,
    maxAmount: minAmount,
  } satisfies IShoppingMallSellerFeeAnalytics.IRequest;

  await TestValidator.error(
    "minAmount greater than maxAmount should result in error",
    async () => {
      await api.functional.shoppingMall.seller.analytics.sellerFees.index(
        connection,
        {
          body: invalidRangeRequest,
        },
      );
    },
  );
}
