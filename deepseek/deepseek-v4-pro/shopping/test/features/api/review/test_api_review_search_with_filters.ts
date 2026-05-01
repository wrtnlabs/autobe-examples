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
 * Test review search with combined rating range and content text filters.
 *
 * Validates that the review search endpoint applies rating range and content
 * search filters conjunctively, returning only reviews that satisfy all
 * specified criteria. The test authenticates as a customer and searches with a
 * rating range of 3 to 5 stars combined with a case-insensitive content search
 * for the term "quality".
 *
 * Verifies that all returned reviews have ratings within the inclusive [3, 5]
 * range and that every review with non-null written content contains the search
 * term regardless of capitalization. Confirms conjunctive filter logic by
 * comparing against a broader search without the contentSearch filter, and
 * ensures that reviews with null content are never matched by content search as
 * specified in the server-side ILIKE behavior. Pagination metadata is validated
 * for consistency against the actual data.
 *
 * 1. Authenticate as a customer via join to access the review search endpoint.
 * 2. Search with ratingMin=3, ratingMax=5, and contentSearch="quality".
 * 3. Validate each returned review's rating and content against filter criteria.
 * 4. Validate pagination metadata: records, limit, pages calculation.
 * 5. Perform broader search without contentSearch to validate AND logic.
 * 6. Verify null-content reviews from the broader search are excluded from
 *    the content-filtered results.
 */
export async function test_api_review_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, { body: {} });
  // 2. Search with combined filters: rating [3,5] + content "quality"
  const filteredResult =
    await api.functional.shoppingMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          ratingMin: 3,
          ratingMax: 5,
          contentSearch: "quality",
          limit: 100,
        } satisfies IShoppingMallReviewReview.IRequest,
      },
    );
  typia.assert(filteredResult);
  // 3. Validate rating range and content filter on each review
  for (const review of filteredResult.data) {
    TestValidator.predicate(
      `rating >= 3 for review ${review.id}`,
      review.rating >= 3,
    );
    TestValidator.predicate(
      `rating <= 5 for review ${review.id}`,
      review.rating <= 5,
    );
    if (review.content !== null) {
      TestValidator.predicate(
        `content contains "quality" (case-insensitive) for review ${review.id}`,
        review.content.toLowerCase().includes("quality"),
      );
    }
  }
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination records >= data.length",
    filteredResult.pagination.records >= filteredResult.data.length,
  );
  TestValidator.equals(
    "pagination limit",
    filteredResult.pagination.limit,
    100,
  );
  const expectedPages = Math.ceil(
    filteredResult.pagination.records / filteredResult.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages",
    filteredResult.pagination.pages,
    expectedPages,
  );
  // 5. Test AND logic: broader search without contentSearch
  const broaderResult =
    await api.functional.shoppingMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          ratingMin: 3,
          ratingMax: 5,
          limit: 100,
        } satisfies IShoppingMallReviewReview.IRequest,
      },
    );
  typia.assert(broaderResult);
  TestValidator.predicate(
    "AND logic: filtered results <= broader results",
    filteredResult.pagination.records <= broaderResult.pagination.records,
  );
  // 6. Verify null-content reviews are excluded by contentSearch
  const filteredIds = new Set(filteredResult.data.map((r) => r.id));
  for (const review of broaderResult.data) {
    if (review.content === null) {
      TestValidator.predicate(
        `null-content review ${review.id} excluded from contentSearch results`,
        !filteredIds.has(review.id),
      );
    }
  }
}
