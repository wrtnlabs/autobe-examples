import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Verify that requesting a non-existent product review returns an error instead
 * of a normal IShoppingMallProductReview payload.
 *
 * Business context:
 *
 * - The public review detail endpoint `GET /shoppingMall/reviews/{reviewId}`
 *   should not leak information about internal storage when a client asks for a
 *   review that does not exist.
 * - Instead, it must fail with a standardized not-found error that is handled by
 *   global error mapping.
 * - E2E tests are not allowed to assert the exact HTTP status code, but we can
 *   and must validate that an error is raised for an unknown ID.
 *
 * Scenario steps:
 *
 * 1. Generate a random UUID value that is overwhelmingly unlikely to be associated
 *    with any existing review in `shopping_mall_product_reviews`.
 * 2. Call `api.functional.shoppingMall.reviews.at` with this unknown `reviewId`.
 * 3. Wrap the call in `TestValidator.error` to assert that an error is thrown,
 *    which indirectly confirms that the backend does not treat the unknown ID
 *    as a valid review and does not return an `IShoppingMallProductReview`
 *    document.
 *
 * Notes and constraints:
 *
 * - We do not attempt to inspect `HttpError.status` to check for 404, because E2E
 *   test guidelines prohibit asserting specific HTTP status codes.
 * - We do not manipulate `connection.headers`; authentication is not required for
 *   this public endpoint.
 * - We use a properly formatted UUID for `reviewId` to keep the test focused on
 *   the not-found condition, not on validation of malformed IDs.
 */
export async function test_api_review_detail_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID-style review identifier
  const unknownReviewId = typia.random<string & tags.Format<"uuid">>();

  // 2. Ensure that requesting this unknown review ID results in an error
  await TestValidator.error(
    "unknown reviewId should result in not-found style error",
    async () => {
      await api.functional.shoppingMall.reviews.at(connection, {
        reviewId: unknownReviewId,
      });
    },
  );
}
