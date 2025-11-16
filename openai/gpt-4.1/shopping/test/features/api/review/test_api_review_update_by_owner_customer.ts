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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test updating a product review by its rightful owner customer.
 *
 * - Authenticates as a newly registered customer and creates a review as the
 *   owner.
 * - Successfully updates the review's content (title, body), toggles
 *   draft/publish state, and changes moderation status using allowed fields.
 * - Ensures modified fields are actually updated and audit (updated_at) is
 *   refreshed.
 * - Validates the update is only permitted for the owner within allowed edit
 *   times and states.
 * - Attempts to update the review as a non-owner customer and expects failure
 *   (forbidden error).
 */
export async function test_api_review_update_by_owner_customer(
  connection: api.IConnection,
) {
  // Register and authenticate as Owner Customer
  const ownerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "Aa.",
    name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;
  const ownerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: ownerInput });
  typia.assert(ownerAuth);

  // Create a review as Owner Customer
  const reviewCreateInput = {
    // For realistic linking, generate all as random UUIDs
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_sku_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_item_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_rating_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    is_draft: false,
    moderation_status: "pending",
    withdrawn_at: null,
  } satisfies IShoppingMallReview.ICreate;
  const review: IShoppingMallReview =
    await api.functional.shoppingMall.reviews.create(connection, {
      body: reviewCreateInput,
    });
  typia.assert(review);

  // Owner updates the review (change title, body, draft, and moderation status)
  const updateInput = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 12,
      sentenceMax: 30,
    }),
    is_draft: true,
    moderation_status: "approved",
    moderation_reason: "Automated review quality verified",
    withdrawn_at: null,
  } satisfies IShoppingMallReview.IUpdate;
  const updatedReview: IShoppingMallReview =
    await api.functional.shoppingMall.customer.reviews.update(connection, {
      reviewId: review.id,
      body: updateInput,
    });
  typia.assert(updatedReview);
  TestValidator.notEquals(
    "review updated_at changes after update",
    updatedReview.updated_at,
    review.updated_at,
  );
  TestValidator.equals("review id is unchanged", updatedReview.id, review.id);
  TestValidator.equals("title updated", updatedReview.title, updateInput.title);
  TestValidator.equals("body updated", updatedReview.body, updateInput.body);
  TestValidator.equals(
    "is_draft updated",
    updatedReview.is_draft,
    updateInput.is_draft,
  );
  TestValidator.equals(
    "moderation_status updated",
    updatedReview.moderation_status,
    updateInput.moderation_status,
  );
  TestValidator.equals(
    "moderation_reason updated",
    updatedReview.moderation_reason,
    updateInput.moderation_reason,
  );

  // Register and authenticate a second (non-owner) customer
  const otherInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "Bb.",
    name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;
  const otherAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: otherInput });
  typia.assert(otherAuth);

  // Attempt unauthorized review update as non-owner, expect forbidden error
  await TestValidator.error(
    "non-owner customer cannot update review",
    async () => {
      await api.functional.shoppingMall.customer.reviews.update(connection, {
        reviewId: review.id,
        body: {
          title: RandomGenerator.name(3),
        } satisfies IShoppingMallReview.IUpdate,
      });
    },
  );
}
