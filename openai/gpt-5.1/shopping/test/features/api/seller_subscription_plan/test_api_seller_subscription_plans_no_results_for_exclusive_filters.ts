import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSubscriptionPlan";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

/**
 * Validate that the seller subscription plan search endpoint returns a
 * well-formed empty page when filters are so exclusive that no plans match.
 *
 * Business context
 *
 * - Administrative tooling can apply very restrictive filters (e.g. impossible
 *   plan codes or extremely high minimum prices). The backend must handle this
 *   gracefully by returning an empty dataset with consistent pagination
 *   metadata rather than an error.
 *
 * Scenario steps
 *
 * 1. Construct a highly exclusive but valid search request body:
 *
 *    - Page = 1, limit = 10
 *    - Code = "NON_EXISTENT_PLAN_CODE_" + random suffix so it should not match any
 *         stored plan.
 *    - Price_min set to a very high value to further guarantee no match.
 * 2. Call PATCH /shoppingMall/sellerSubscriptionPlans through
 *    api.functional.shoppingMall.sellerSubscriptionPlans.index.
 * 3. Use typia.assert to ensure the response conforms to
 *    IPageIShoppingMallSellerSubscriptionPlan.ISummary.
 * 4. Verify business expectations for an empty result set:
 *
 *    - Data is an empty array.
 *    - Pagination.records is 0.
 *    - Pagination.current equals the requested page (1).
 *    - Pagination.limit equals the requested limit (10).
 *    - Pagination.pages is a non-negative integer; its exact value when records == 0
 *         is implementation-specific, so we only assert non-negativity.
 * 5. Rely on the SDK to throw HttpError on non-2xx; reaching assertions means the
 *    operation was treated as a successful empty search.
 */
export async function test_api_seller_subscription_plans_no_results_for_exclusive_filters(
  connection: api.IConnection,
) {
  // 1. Build an exclusive filter body that should not match any plan
  const page = 1 satisfies number;
  const limit = 10 satisfies number;
  const randomSuffix: string = RandomGenerator.alphaNumeric(16);
  const nonExistentCode = `NON_EXISTENT_PLAN_CODE_${randomSuffix}`;

  const body = {
    page,
    limit,
    code: nonExistentCode,
    // Additionally constrain by an extremely high minimum price
    price_min: 1_000_000_000,
  } satisfies IShoppingMallSellerSubscriptionPlan.IRequest;

  // 2. Invoke the search endpoint with exclusive filters
  const pageResult: IPageIShoppingMallSellerSubscriptionPlan.ISummary =
    await api.functional.shoppingMall.sellerSubscriptionPlans.index(
      connection,
      { body },
    );

  // 3. Structural validation of the response
  typia.assert<IPageIShoppingMallSellerSubscriptionPlan.ISummary>(pageResult);

  // 4. Business assertions for an empty result set
  TestValidator.equals(
    "pagination.current should match requested page when no results",
    page,
    pageResult.pagination.current,
  );

  TestValidator.equals(
    "pagination.limit should match requested limit when no results",
    limit,
    pageResult.pagination.limit,
  );

  TestValidator.predicate(
    "seller subscription plan search with exclusive filters should return empty data array",
    pageResult.data.length === 0,
  );

  TestValidator.predicate(
    "pagination.records should be zero when no seller subscription plans match",
    pageResult.pagination.records === 0,
  );

  TestValidator.predicate(
    "pagination.pages should be a non-negative value when records are zero",
    pageResult.pagination.pages >= 0,
  );
}
