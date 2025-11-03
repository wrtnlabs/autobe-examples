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
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";

/**
 * Validates that a newly-authenticated customer can retrieve the full details
 * of their own review and that review ownership is respected.
 *
 * Steps:
 *
 * 1. Register a new customer and obtain auth context
 * 2. Create a review for a SKU+order_line (requires valid IDs)
 * 3. Retrieve review detail by ID, expecting full detail and verified ownership
 * 4. Assert all review fields (content, rating, customer summary) match
 * 5. Negative: Another customer attempts retrieval and fails (forbidden/not found)
 */
export async function test_api_customer_retrieve_own_product_review_detail(
  connection: api.IConnection,
) {
  // 1. Customer joins
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(12) as string &
          tags.MinLength<8> &
          tags.MaxLength<128>,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://shop.example.com/register",
        referrer: "https://shop.example.com/landing",
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // For review, we need to simulate owning a valid order_line and SKU.
  // Since test infra does NOT provide product purchase infra, simulating review creation with random ids.
  const shoppingSkuId = typia.random<string & tags.Format<"uuid">>();
  const shoppingOrderLineId = typia.random<string & tags.Format<"uuid">>();
  const reviewReq = {
    shopping_sku_id: shoppingSkuId,
    shopping_order_line_id: shoppingOrderLineId,
    rating: 5,
    comment: RandomGenerator.paragraph({ sentences: 5 }),
    attachments: [],
  } satisfies IShoppingReview.ICreate;

  const createdReview: IShoppingReview =
    await api.functional.shopping.customer.reviews.create(connection, {
      body: reviewReq,
    });
  typia.assert(createdReview);

  // 3. Retrieve review detail as owner
  const fetched: IShoppingReview =
    await api.functional.shopping.customer.reviews.at(connection, {
      reviewId: createdReview.id,
    });
  typia.assert(fetched);
  // Basic assertions
  TestValidator.equals("review id matches", fetched.id, createdReview.id);
  TestValidator.equals(
    "review sku matches",
    fetched.sku.id,
    createdReview.sku.id,
  );
  TestValidator.equals(
    "review customer matches",
    fetched.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "review content matches",
    fetched.comment,
    reviewReq.comment,
  );
  TestValidator.equals(
    "review rating matches",
    fetched.rating,
    reviewReq.rating,
  );

  // 4. Negative test: another customer cannot fetch this review
  const otherEmail: string = typia.random<string & tags.Format<"email">>();
  const otherCustomer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: otherEmail,
        password: RandomGenerator.alphaNumeric(12) as string &
          tags.MinLength<8> &
          tags.MaxLength<128>,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://shop.example.com/register",
        referrer: "https://shop.example.com/landing",
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(otherCustomer);
  // Now this connection is authenticated as otherCustomer
  await TestValidator.error(
    "another customer forbidden to get review",
    async () => {
      await api.functional.shopping.customer.reviews.at(connection, {
        reviewId: createdReview.id,
      });
    },
  );
}
