import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSubscriptionPlan";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

/**
 * Validate that seller subscription plan listing supports billing period and
 * price range filters.
 *
 * Business goal:
 *
 * - Ensure administrative listing endpoint for seller subscription plans can
 *   filter by billing_period (e.g., "monthly") and by an inclusive price range
 *   defined by price_min and price_max.
 * - Confirm pagination metadata is consistent with returned data.
 * - Confirm that a disjoint price range returns an empty result set.
 *
 * Steps:
 *
 * 1. Call index endpoint with a filter using a concrete billing_period and a broad
 *    price range that is likely to return some records.
 * 2. Assert that every returned plan has the exact requested billing_period and a
 *    price_amount within the specified range.
 * 3. Validate pagination metadata: records >= data.length and pages computed
 *    consistently with limit when records > 0.
 * 4. Call index endpoint again with a price range that is extremely narrow and
 *    unlikely to match any existing plan, while keeping the same
 *    billing_period.
 * 5. Assert that the negative-control query returns either zero records or at
 *    least no item outside of the requested price range and with a different
 *    billing_period.
 */
export async function test_api_seller_subscription_plans_filter_by_billing_period_and_price_range(
  connection: api.IConnection,
) {
  // 1. Define target billing_period and price range
  const billingPeriod = RandomGenerator.pick([
    "monthly",
    "yearly",
    "weekly",
  ] as const);

  const priceMin = 1000;
  const priceMax = 100000;

  const requestBody = {
    page: 1,
    limit: 50,
    billing_period: billingPeriod,
    price_min: priceMin,
    price_max: priceMax,
  } satisfies IShoppingMallSellerSubscriptionPlan.IRequest;

  // 2. Call the index endpoint with filters
  const pageResult: IPageIShoppingMallSellerSubscriptionPlan.ISummary =
    await api.functional.shoppingMall.sellerSubscriptionPlans.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallSellerSubscriptionPlan.ISummary>(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  const data: IShoppingMallSellerSubscriptionPlan.ISummary[] = pageResult.data;

  typia.assert<IPage.IPagination>(pagination);

  // 3. Validate each record satisfies filters when data is not empty
  for (const plan of data) {
    typia.assert<IShoppingMallSellerSubscriptionPlan.ISummary>(plan);

    TestValidator.equals(
      "billing_period must match filter",
      plan.billing_period,
      billingPeriod,
    );

    TestValidator.predicate(
      "price_amount must be greater than or equal to price_min",
      plan.price_amount >= priceMin,
    );

    TestValidator.predicate(
      "price_amount must be less than or equal to price_max",
      plan.price_amount <= priceMax,
    );
  }

  // 4. Basic pagination consistency checks
  TestValidator.predicate(
    "records should be at least size of returned data",
    pagination.records >= data.length,
  );

  TestValidator.predicate("limit should be positive", pagination.limit >= 0);

  TestValidator.predicate(
    "current page should be non-negative",
    pagination.current >= 0,
  );

  TestValidator.predicate(
    "pages should be non-negative",
    pagination.pages >= 0,
  );

  if (pagination.limit > 0 && pagination.records > 0) {
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "pages should be consistent with records and limit",
      pagination.pages,
      expectedPages,
    );
  }

  // 5. Negative-control query: choose a narrow price band unlikely to have results.
  // Use a very high price_min and price_max within a tiny band.
  const negativePriceMin = 987654321;
  const negativePriceMax = 987654322;

  const negativeRequestBody = {
    page: 1,
    limit: 10,
    billing_period: billingPeriod,
    price_min: negativePriceMin,
    price_max: negativePriceMax,
  } satisfies IShoppingMallSellerSubscriptionPlan.IRequest;

  const negativeResult: IPageIShoppingMallSellerSubscriptionPlan.ISummary =
    await api.functional.shoppingMall.sellerSubscriptionPlans.index(
      connection,
      {
        body: negativeRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallSellerSubscriptionPlan.ISummary>(
    negativeResult,
  );

  const negativePagination: IPage.IPagination = negativeResult.pagination;
  const negativeData: IShoppingMallSellerSubscriptionPlan.ISummary[] =
    negativeResult.data;

  // If there are any records, they must still match the requested filter and narrow price band.
  for (const plan of negativeData) {
    typia.assert<IShoppingMallSellerSubscriptionPlan.ISummary>(plan);

    TestValidator.equals(
      "negative-case billing_period must match filter",
      plan.billing_period,
      billingPeriod,
    );

    TestValidator.predicate(
      "negative-case price_amount must be >= negativePriceMin",
      plan.price_amount >= negativePriceMin,
    );

    TestValidator.predicate(
      "negative-case price_amount must be <= negativePriceMax",
      plan.price_amount <= negativePriceMax,
    );
  }

  TestValidator.predicate(
    "negative-case records should be >= data length",
    negativePagination.records >= negativeData.length,
  );
}
