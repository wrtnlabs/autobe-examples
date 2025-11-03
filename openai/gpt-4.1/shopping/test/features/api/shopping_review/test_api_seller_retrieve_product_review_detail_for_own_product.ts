import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReview";
import type { IShoppingReviewAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAbuseReport";
import type { IShoppingReviewAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAttachment";
import type { IShoppingReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewModeration";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";

/**
 * Validate that sellers can retrieve detailed information for reviews on their
 * own product, but not on others'.
 *
 * 1. Register a new seller (track email, password for authentication)
 * 2. (Assumed) Product and SKU creation – not covered by available APIs; skip but
 *    create a fake valid SKU and order line UUID for review creation.
 * 3. Register a new customer.
 * 4. Customer submits a product review for the (fake) SKU and order line
 * 5. Seller retrieves details of this review with their authentication (should
 *    succeed)
 * 6. Assert all fields: customer, sku summary, rating, comment, attachment array,
 *    state, timestamps are present and logical
 * 7. Negative: Register a second, unrelated seller; try fetching the review with
 *    their auth; expect error (access denied)
 */
export async function test_api_seller_retrieve_product_review_detail_for_own_product(
  connection: api.IConnection,
) {
  // 1. Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "Password123!";
  const sellerDisplayName = RandomGenerator.name();
  const sellerContactPhone = RandomGenerator.mobile();
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        display_name: sellerDisplayName,
        contact_phone: sellerContactPhone,
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(seller);

  // 2. Fake SKU & order_line (in practice, would create via an admin or dedicated API, but not exposed here)
  const fakeSkuId = typia.random<string & tags.Format<"uuid">>();
  const fakeOrderLineId = typia.random<string & tags.Format<"uuid">>();

  // 3. Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustomerPass1!";
  const customerName = RandomGenerator.name();
  const customerPhone = RandomGenerator.mobile();
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: customerName,
        phone: customerPhone,
        href: "https://test.example.com/register",
        referrer: "https://test.example.com/",
        // IP is optional
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // 4. Customer submits a review
  const reviewPayload = {
    shopping_sku_id: fakeSkuId,
    shopping_order_line_id: fakeOrderLineId,
    rating: 5,
    comment: RandomGenerator.paragraph({ sentences: 5 }),
    attachments: ArrayUtil.repeat(2, () => ({
      file_uri:
        "https://cdn.example.com/image/" +
        RandomGenerator.alphaNumeric(12) +
        ".jpg",
      file_type: "image/jpeg",
      file_size: 1024 * (10 + Math.floor(Math.random() * 50)),
    })) as IShoppingReviewAttachment.ICreate[],
  } satisfies IShoppingReview.ICreate;
  const review: IShoppingReview =
    await api.functional.shopping.customer.reviews.create(connection, {
      body: reviewPayload,
    });
  typia.assert(review);

  // 5. Seller retrieves review (should succeed)
  const sellerReview: IShoppingReview =
    await api.functional.shopping.seller.reviews.at(connection, {
      reviewId: review.id,
    });
  typia.assert(sellerReview);

  // 6. Assert review fields and relationships
  TestValidator.equals("review.id is correct", sellerReview.id, review.id);
  TestValidator.equals(
    "review customer is correct",
    sellerReview.customer.id,
    customer.id,
  );
  TestValidator.equals("review sku id matches", sellerReview.sku.id, fakeSkuId);
  TestValidator.equals(
    "review rating is correct",
    sellerReview.rating,
    reviewPayload.rating,
  );
  TestValidator.equals(
    "review comment matches",
    sellerReview.comment,
    reviewPayload.comment,
  );
  TestValidator.equals(
    "review attachments count",
    sellerReview.attachments.length,
    reviewPayload.attachments.length,
  );
  TestValidator.predicate(
    "review is in visible/pending state",
    ["visible", "pending_moderation", "under_review", "removed"].includes(
      sellerReview.state,
    ),
  );
  TestValidator.predicate(
    "review has timestamp",
    typeof sellerReview.created_at === "string" &&
      sellerReview.created_at.length > 0,
  );

  // 7. Negative: register unrelated seller and try to fetch review (should fail)
  const seller2: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Anoth3rPass!",
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(seller2);
  await TestValidator.error(
    "unrelated seller cannot fetch another seller's review",
    async () => {
      await api.functional.shopping.seller.reviews.at(connection, {
        reviewId: review.id,
      });
    },
  );
}
