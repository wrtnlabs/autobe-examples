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
 * Validate seller's ability to delete their own review response, enforcing
 * access control and business logic for soft deletion.
 *
 * Scenario steps:
 *
 * 1. Register and authenticate Seller A
 * 2. Create a dummy product review (simulate all required IDs and values for
 *    review creation)
 * 3. Post a seller response to the review as Seller A
 * 4. Delete the response using the correct seller context
 * 5. Assert: Deletion does not throw and is successful
 * 6. Optionally, attempt to fetch/recreate the response to check it's soft-deleted
 *    (if applicable to the current SDK API)
 * 7. Register and authenticate Seller B
 * 8. Attempt to delete the same response as Seller B; expect error
 */
export async function test_api_seller_review_response_deletion(
  connection: api.IConnection,
) {
  // 1. Register and authenticate Seller A
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerARegistration = {
    email: sellerAEmail,
    password: "passw0rdA!",
    business_name: RandomGenerator.name(2),
    registration_number: RandomGenerator.alphaNumeric(10),
    business_phone: RandomGenerator.mobile(),
    href: "https://seller-a-test.com/onboarding",
    referrer: "https://referrer.com/",
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAAuth = await api.functional.auth.seller.join(connection, {
    body: sellerARegistration,
  });
  typia.assert(sellerAAuth);

  // 2. Create a dummy product review; simulate all nested IDs and required values.
  const reviewBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 15 }),
    shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_sku_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_item_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_rating_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    is_draft: false,
    moderation_status: "approved",
  } satisfies IShoppingMallReview.ICreate;
  const review = await api.functional.shoppingMall.reviews.create(connection, {
    body: reviewBody,
  });
  typia.assert(review);

  // 3. Post a seller response to the review as Seller A
  const responseBody = {
    body: RandomGenerator.paragraph({ sentences: 10 }),
    moderation_status: "approved",
  } satisfies IShoppingMallReviewResponse.ICreate;
  const response =
    await api.functional.shoppingMall.seller.reviews.responses.create(
      connection,
      { reviewId: review.id, body: responseBody },
    );
  typia.assert(response);

  // 4. Delete the response as Seller A
  await api.functional.shoppingMall.seller.reviews.responses.erase(connection, {
    reviewId: review.id,
    responseId: response.id,
  });

  // 5. (Optionally) Check that additional delete leads to error (already deleted)
  await TestValidator.error(
    "Deleting already-deleted response should fail",
    async () => {
      await api.functional.shoppingMall.seller.reviews.responses.erase(
        connection,
        { reviewId: review.id, responseId: response.id },
      );
    },
  );

  // 6. Register and authenticate Seller B
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBRegistration = {
    email: sellerBEmail,
    password: "passw0rdB!",
    business_name: RandomGenerator.name(2),
    registration_number: RandomGenerator.alphaNumeric(10),
    business_phone: RandomGenerator.mobile(),
    href: "https://seller-b-test.com/onboarding",
    referrer: "https://referrer.com/",
  } satisfies IShoppingMallSeller.ICreate;
  const sellerBAuth = await api.functional.auth.seller.join(connection, {
    body: sellerBRegistration,
  });
  typia.assert(sellerBAuth);

  // 7. Attempt to delete Seller A's response as Seller B (should fail by access control)
  await TestValidator.error(
    "Non-owner seller cannot delete another seller's review response",
    async () => {
      await api.functional.shoppingMall.seller.reviews.responses.erase(
        connection,
        { reviewId: review.id, responseId: response.id },
      );
    },
  );
}
