import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductReviewSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewSellerResponse";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate error handling when requesting a seller response for a non-existent
 * review.
 *
 * Business goal
 *
 * - Ensure that the public seller-response endpoint does not return a normal
 *   seller response when the target review does not exist, and instead responds
 *   with a client-side not-found HTTP error.
 *
 * What this test covers
 *
 * 1. Generate a syntactically valid but arbitrary UUID for `reviewId`.
 * 2. Call GET /shoppingMall/reviews/{reviewId}/sellerResponse using the SDK
 *    wrapper `api.functional.shoppingMall.reviews.sellerResponse.at`.
 * 3. Verify that the call fails with an HttpError whose status is 404 (not-found)
 *    by using `TestValidator.httpError`.
 * 4. Implicitly confirm that no `IShoppingMallProductReviewSellerResponse` payload
 *    is returned for a non-existent review.
 *
 * Notes
 *
 * - We cannot prove non-existence of the UUID by querying other APIs because only
 *   this single endpoint is available in the current test context. Instead, we
 *   rely on using a freshly generated random UUID and expecting the backend to
 *   treat unknown review IDs as not-found.
 */
export async function test_api_public_seller_response_nonexistent_review(
  connection: api.IConnection,
) {
  // 1. Prepare a syntactically valid but arbitrary UUID for reviewId
  const nonexistentReviewId = typia.random<string & tags.Format<"uuid">>();

  // 2. Invoke the endpoint and expect a 404 not-found style HttpError
  await TestValidator.httpError(
    "requesting seller response for non-existent review should return 404 error",
    404,
    async () => {
      await api.functional.shoppingMall.reviews.sellerResponse.at(connection, {
        reviewId: nonexistentReviewId,
      });
    },
  );
}
