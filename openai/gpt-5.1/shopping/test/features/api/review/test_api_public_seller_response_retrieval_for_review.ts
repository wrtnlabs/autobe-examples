import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductReviewSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewSellerResponse";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate public retrieval of a seller-authored response for a product review.
 *
 * Business intent:
 *
 * - Once a seller has responded to a customer’s product review, any client
 *   (authenticated or not) should be able to retrieve that seller response
 *   using the reviewId via the public endpoint GET
 *   /shoppingMall/reviews/{reviewId}/sellerResponse.
 *
 * Given the provided SDK:
 *
 * - We have a concrete GET endpoint
 *   api.functional.shoppingMall.reviews.sellerResponse.at(connection, {
 *   reviewId }) that returns IShoppingMallProductReviewSellerResponse.
 * - We do NOT have a POST endpoint for creating/updating seller responses or full
 *   purchase/review workflows, so this test focuses on the readable,
 *   public-response path only.
 *
 * Test focus:
 *
 * - Call the public GET endpoint with a syntactically valid UUID reviewId.
 * - Use typia.assert to ensure the response strictly matches
 *   IShoppingMallProductReviewSellerResponse.
 * - Perform simple, business-level checks that the response has non-empty
 *   identifiers and content, rather than re-validating types or formats that
 *   typia.assert already guarantees.
 *
 * Steps:
 *
 * 1. Generate a random UUID reviewId using typia.random.
 * 2. Call api.functional.shoppingMall.reviews.sellerResponse.at with that
 *    reviewId.
 * 3. Run typia.assert on the response to fully validate its type.
 * 4. Use TestValidator.predicate for business-oriented sanity checks:
 *
 *    - Seller response id is non-empty
 *    - Response body is non-empty
 */
export async function test_api_public_seller_response_retrieval_for_review(
  connection: api.IConnection,
) {
  // 1. Prepare a random reviewId as a UUID string.
  const reviewId = typia.random<string & tags.Format<"uuid">>();

  // 2. Call the public GET endpoint to fetch the seller response.
  const response: IShoppingMallProductReviewSellerResponse =
    await api.functional.shoppingMall.reviews.sellerResponse.at(connection, {
      reviewId,
    });

  // 3. Validate the response shape strictly against the DTO type.
  typia.assert<IShoppingMallProductReviewSellerResponse>(response);

  // 4. Business-level assertions using TestValidator (no duplicate type checks).
  TestValidator.predicate(
    "seller response id is non-empty string",
    response.id.length > 0,
  );

  TestValidator.predicate(
    "seller response body is non-empty string",
    response.body.length > 0,
  );
}
