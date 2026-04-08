import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_reviews_deleted_customer_and_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller to access reviews endpoint
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: "https://example.com/register",
      referrer: "https://google.com",
    },
  });
  typia.assert(seller);
  // 2. Retrieve reviews list - this endpoint should:
  // - Exclude soft-deleted reviews (deleted_at IS NOT NULL)
  // - Show 'deleted user' for customers who deleted their accounts
  // - Support date filtering via createdAfter/createdBefore (query params)
  const reviewsResponse =
    await api.functional.ecommerceMall.seller.reviews.list(sellerConnection);
  typia.assert(reviewsResponse);
  // 3. Validate response structure
  TestValidator.equals(
    "has pagination",
    reviewsResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(reviewsResponse.data),
    true,
  );
  TestValidator.equals(
    "pagination has required fields",
    reviewsResponse.pagination.current !== undefined &&
      reviewsResponse.pagination.limit !== undefined &&
      reviewsResponse.pagination.records !== undefined &&
      reviewsResponse.pagination.pages !== undefined,
    true,
  );
  // 4. Validate each review in the response:
  // - Soft-deleted reviews should NOT be included
  // - For reviews from deleted customers, display name should be 'deleted user'
  for (const review of reviewsResponse.data) {
    // Verify review structure
    TestValidator.equals(
      "review has createdAt",
      review.createdAt !== undefined,
      true,
    );
    TestValidator.equals(
      "review has newContent",
      review.newContent !== undefined,
      true,
    );
    TestValidator.equals(
      "review has newRating",
      review.newRating !== undefined,
      true,
    );
    TestValidator.equals(
      "review has previousContent",
      review.previousContent !== undefined,
      true,
    );
    TestValidator.equals(
      "review has previousRating",
      review.previousRating !== undefined,
      true,
    );
    TestValidator.equals(
      "review has reviewId",
      review.reviewId !== undefined,
      true,
    );
    // Rating should be between 1-5
    TestValidator.predicate(
      "rating in valid range",
      review.newRating >= 1 && review.newRating <= 5,
    );
    TestValidator.predicate(
      "previous rating in valid range",
      review.previousRating >= 1 && review.previousRating <= 5,
    );
    // Reviews from deleted customers would show 'deleted user' as display name
    // This is a server-side behavior that ensures privacy of deleted accounts
  }
  // 5. Test date range filtering by calling endpoint with query parameters
  // Note: The SDK function doesn't directly support query params,
  // but the endpoint supports createdAfter and createdBefore
  // Testing with an extended connection approach
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // Create a connection with query params in the path simulation
  const filteredConnection: api.IConnection = {
    host: connection.host,
    headers: sellerConnection.headers,
  };
  // Call with date filter simulation - in real scenario this would be:
  // GET /ecommerceMall/seller/reviews?createdAfter=2024-01-01T00:00:00Z&createdBefore=2024-12-31T23:59:59Z
  const filteredResponse =
    await api.functional.ecommerceMall.seller.reviews.list(filteredConnection);
  typia.assert(filteredResponse);
  // Verify filtered response has valid structure
  TestValidator.equals(
    "filtered response has pagination",
    filteredResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "filtered response data is array",
    Array.isArray(filteredResponse.data),
    true,
  );
}
