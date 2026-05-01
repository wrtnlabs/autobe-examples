import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewReview";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test review search sorted by star rating in ascending order.
 *
 * Validates the global review search endpoint with rating-based sorting. Ensures that when `sortField` is set to "rating" and `sortDirection` to "asc", reviews are returned in ascending star rating order — 1-star reviews appear first and 5-star reviews appear last. Also verifies pagination metadata consistency between records, limit, and pages.
 *
 * 1. Customer registers and authenticates via join.
 * 2. Customer calls the review search endpoint with sortField="rating" and sortDirection="asc".
 * 3. typia.assert validates the complete response structure against IPageIShoppingMallReviewReview.ISummary.
 * 4. Iterates through results to confirm non-decreasing rating sequence.
 * 5. Checks pagination metadata: zero records implies zero pages, otherwise at least one page.
 */
export async function test_api_review_search_sorted_by_rating(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, { body: {} });
  const result = await api.functional.shoppingMall.customer.reviews.index(
    customerConnection,
    {
      body: {
        sortField: "rating",
        sortDirection: "asc",
      } satisfies IShoppingMallReviewReview.IRequest,
    },
  );
  typia.assert(result);
  // Validate ascending sort order
  if (result.data.length > 1) {
    for (let i = 1; i < result.data.length; i++) {
      TestValidator.predicate(
        `reviews sorted by rating ascending: reviews[${i}].rating(${result.data[i].rating}) >= reviews[${i - 1}].rating(${result.data[i - 1].rating})`,
        result.data[i].rating >= result.data[i - 1].rating,
      );
    }
  }
  // Validate pagination consistency
  TestValidator.predicate(
    "pagination pages consistent with records",
    result.pagination.records === 0
      ? result.pagination.pages === 0
      : result.pagination.pages > 0,
  );
}
