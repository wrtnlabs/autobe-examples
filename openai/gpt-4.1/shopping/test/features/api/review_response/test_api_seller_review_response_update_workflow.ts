import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewResponse";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that an authenticated seller can successfully update their existing
 * response to a customer product review.
 *
 * 1. Create a review as a customer (random-valid payload).
 * 2. Register and authenticate as a new seller, using fresh email and registration
 *    number, for a valid seller with business details.
 * 3. As the seller, create an initial review response to the review. (Link with
 *    reviewId, body, moderation_status, and null moderation_reason.)
 * 4. Update the created seller response, modifying the "body" (ensure 10+ chars)
 *    and optionally moderation_status (random string again).
 * 5. Assert the update result: returned response matches updated body, status, and
 *    keeps consistent IDs, ownership, and review linkage.
 * 6. Also, verify the ownership/permission and business rules are respected
 *    (positive path only).
 */
export async function test_api_seller_review_response_update_workflow(
  connection: api.IConnection,
) {
  // 1. Create a customer product review (simulate real customer experience)
  const review: IShoppingMallReview =
    await api.functional.shoppingMall.reviews.create(connection, {
      body: typia.random<IShoppingMallReview.ICreate>(),
    });
  typia.assert(review);

  // 2. Register and authenticate as a unique seller
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        business_name: RandomGenerator.paragraph({ sentences: 2 }),
        registration_number: RandomGenerator.alphaNumeric(10),
        business_phone: RandomGenerator.mobile(),
        href: "https://domain.example/seller-join",
        referrer: "https://domain.example/landing",
        ip: undefined,
      },
    });
  typia.assert(sellerAuth);

  // 3. As seller, create response to review
  const initialResponse: IShoppingMallReviewResponse =
    await api.functional.shoppingMall.seller.reviews.responses.create(
      connection,
      {
        reviewId: review.id,
        body: {
          body: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          moderation_status: RandomGenerator.pick([
            "pending",
            "approved",
            "rejected",
            "flagged",
          ] as const),
          moderation_reason: null,
        },
      },
    );
  typia.assert(initialResponse);

  // 4. Prepare update payload
  const updatedBody = RandomGenerator.paragraph({ sentences: 8 });
  const updatedModStatus = RandomGenerator.pick([
    "pending",
    "approved",
    "rejected",
    "flagged",
  ] as const);
  // 5. Update seller response
  const updatedResponse: IShoppingMallReviewResponse =
    await api.functional.shoppingMall.seller.reviews.responses.update(
      connection,
      {
        reviewId: review.id,
        responseId: initialResponse.id,
        body: {
          body: updatedBody,
          moderation_status: updatedModStatus,
          // moderation_reason stays the same (null)
        },
      },
    );
  typia.assert(updatedResponse);

  // 6. Assert update was successful and reflected appropriately
  TestValidator.equals(
    "seller response ID remains the same",
    updatedResponse.id,
    initialResponse.id,
  );
  TestValidator.equals(
    "seller review linkage remains correct",
    updatedResponse.review.id,
    review.id,
  );
  TestValidator.equals(
    "seller identity remains",
    updatedResponse.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals("body updated", updatedResponse.body, updatedBody);
  TestValidator.equals(
    "moderation_status updated",
    updatedResponse.moderation_status,
    updatedModStatus,
  );
}
