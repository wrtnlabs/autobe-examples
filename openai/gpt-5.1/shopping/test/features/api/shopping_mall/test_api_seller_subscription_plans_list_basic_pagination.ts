import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSubscriptionPlan";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

/**
 * Validate basic pagination behavior of seller subscription plans listing.
 *
 * This E2E test calls the public PATCH /shoppingMall/sellerSubscriptionPlans
 * endpoint with only basic pagination parameters (page and limit) and no
 * additional filters, then verifies that the response structure and pagination
 * metadata are consistent with expectations.
 *
 * Steps:
 *
 * 1. Build a minimal IShoppingMallSellerSubscriptionPlan.IRequest body with page =
 *    1 and limit = 10, leaving all optional filters undefined.
 * 2. Call api.functional.shoppingMall.sellerSubscriptionPlans.index using the
 *    shared connection without any authentication steps.
 * 3. Assert the response type using typia.assert to guarantee it matches
 *    IPageIShoppingMallSellerSubscriptionPlan.ISummary.
 * 4. Validate pagination metadata:
 *
 *    - Pagination.current equals 1
 *    - Pagination.limit equals 10
 *    - Pagination.records >= 0
 *    - Pagination.pages >= 0
 *    - Data.length <= pagination.limit
 * 5. When data is non-empty, perform light logical checks on the first element:
 *
 *    - Price_amount is non-negative All other structural and format validations are
 *         delegated to typia.assert, so we do not duplicate those checks here.
 */
export async function test_api_seller_subscription_plans_list_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Build minimal request body (page=1, limit=10) with no filters
  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallSellerSubscriptionPlan.IRequest;

  // 2. Call the seller subscription plans index endpoint
  const pageResult: IPageIShoppingMallSellerSubscriptionPlan.ISummary =
    await api.functional.shoppingMall.sellerSubscriptionPlans.index(
      connection,
      {
        body: requestBody,
      },
    );

  // 3. Validate the response structure and types
  typia.assert<IPageIShoppingMallSellerSubscriptionPlan.ISummary>(pageResult);

  const { pagination, data } = pageResult;

  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination.current should equal requested page (1)",
    pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should equal requested limit (10)",
    pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination.records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length should not exceed pagination.limit",
    data.length <= pagination.limit,
  );

  // 5. Additional checks on first element when data is non-empty
  if (data.length > 0) {
    const first: IShoppingMallSellerSubscriptionPlan.ISummary = data[0];
    typia.assert<IShoppingMallSellerSubscriptionPlan.ISummary>(first);

    TestValidator.predicate(
      "first plan price_amount should be non-negative",
      first.price_amount >= 0,
    );
  }
}
