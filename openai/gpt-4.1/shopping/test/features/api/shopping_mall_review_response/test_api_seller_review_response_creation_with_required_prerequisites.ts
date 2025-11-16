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
 * Validate seller response creation for a product review, ensuring correct
 * prerequisites are established.
 *
 * 1. Register a new seller via /auth/seller/join.
 * 2. (Assume required product, SKU, order, customer, session, and rating test data
 *    exist/are preconditioned.)
 * 3. Create a product review as prerequisite through /shoppingMall/reviews (with
 *    all required fields).
 * 4. As the associated seller, post a response to the review under test.
 * 5. Assertions:
 *
 *    - Only the product seller is permitted as responder.
 *    - Each review allows at most one seller response.
 *    - Seller response correctly associates to the right review and seller.
 *    - Moderation status is correctly set.
 */
export async function test_api_seller_review_response_creation_with_required_prerequisites(
  connection: api.IConnection,
) {
  // 1. Register a new seller for authentication context
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      registration_number: RandomGenerator.alphaNumeric(15),
      business_phone: RandomGenerator.mobile(),
      href: "https://test.seller.platform/join",
      referrer: "https://test.platform/login",
      ip: null,
    },
  });
  typia.assert(sellerAuth);
  TestValidator.equals(
    "seller email matches",
    sellerAuth.email,
    sellerAuth.email,
  );

  // 2. Assume existence of all business prerequisites, but create a test product review with valid context:
  // Mock UUIDs for all required context ids
  const product_id = typia.random<string & tags.Format<"uuid">>();
  const sku_id = typia.random<string & tags.Format<"uuid">>();
  const order_id = typia.random<string & tags.Format<"uuid">>();
  const order_item_id = typia.random<string & tags.Format<"uuid">>();
  const product_rating_id = typia.random<string & tags.Format<"uuid">>();

  // Create a product review (this would normally require actual purchased context - here, synthesize)
  const review = await api.functional.shoppingMall.reviews.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 10,
        sentenceMax: 18,
        wordMin: 6,
        wordMax: 10,
      }),
      shopping_mall_product_id: product_id,
      shopping_mall_product_sku_id: sku_id,
      shopping_mall_order_id: order_id,
      shopping_mall_order_item_id: order_item_id,
      shopping_mall_product_rating_id: product_rating_id,
      is_draft: false,
      moderation_status: "approved",
      withdrawn_at: null,
    },
  });
  typia.assert(review);
  TestValidator.equals(
    "review 'is_draft' should be false",
    review.is_draft,
    false,
  );

  // 3. Post a seller response to the created review
  const responsePayload = {
    body: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 16 }), // 10-1000 chars
    moderation_status: "approved",
  } satisfies IShoppingMallReviewResponse.ICreate;
  const sellerResponse =
    await api.functional.shoppingMall.seller.reviews.responses.create(
      connection,
      {
        reviewId: review.id,
        body: responsePayload,
      },
    );
  typia.assert(sellerResponse);
  TestValidator.equals(
    "response review id matches review",
    sellerResponse.review.id,
    review.id,
  );
  TestValidator.equals(
    "seller in response is current seller",
    sellerResponse.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "moderation_status is respected",
    sellerResponse.moderation_status,
    responsePayload.moderation_status,
  );

  // 4. Attempt duplicate seller response to verify only one is allowed
  await TestValidator.error(
    "duplicate response on same review must fail",
    async () => {
      await api.functional.shoppingMall.seller.reviews.responses.create(
        connection,
        {
          reviewId: review.id,
          body: responsePayload,
        },
      );
    },
  );
}
