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
 * Test successful creation of a new review by a customer for a SKU that has
 * been delivered as part of an order. Validate review includes rating, comment,
 * optional attachments, and linkages to customer/SKU/order line. Enforce one
 * review per SKU per order line; correct state initialization; only
 * delivered/eligible.
 */
export async function test_api_customer_create_review_for_delivered_sku(
  connection: api.IConnection,
) {
  // Customer registration
  const customerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://www.example.com/register",
    referrer: "https://www.example.com/landing",
  } satisfies IShoppingCustomer.ICreate;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerInput,
  });
  typia.assert(customer);

  // Prepare UUIDs to simulate existing delivered SKU/order line
  const deliveredSkuId = typia.random<string & tags.Format<"uuid">>();
  const deliveredOrderLineId = typia.random<string & tags.Format<"uuid">>();

  // Review creation input
  const reviewInput = {
    shopping_sku_id: deliveredSkuId,
    shopping_order_line_id: deliveredOrderLineId,
    rating: 5, // max rating (# of stars)
    comment: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 6,
      wordMax: 10,
    }),
    attachments: ArrayUtil.repeat(2, (i) => ({
      file_uri: `https://cdn.example.com/files/review-${i + 1}-${RandomGenerator.alphaNumeric(5)}.jpg`,
      file_type: "image/jpeg",
      file_size: 1024 * (i + 1),
    })),
  } satisfies IShoppingReview.ICreate;

  // Call API to create review
  const review = await api.functional.shopping.customer.reviews.create(
    connection,
    { body: reviewInput },
  );
  typia.assert(review);

  // Validate core linkages
  TestValidator.equals(
    "review customer id matches",
    review.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "review sku id matches input",
    review.sku.id,
    reviewInput.shopping_sku_id,
  );
  TestValidator.equals(
    "review order_line_id matches input",
    review.order_line_id,
    reviewInput.shopping_order_line_id,
  );

  // Validate initial state and required fields
  TestValidator.equals(
    "review state is visible or pending_moderation",
    ["visible", "pending_moderation"].includes(review.state),
    true,
  );
  TestValidator.equals(
    "star rating matches",
    review.rating,
    reviewInput.rating,
  );
  TestValidator.equals("comment matches", review.comment, reviewInput.comment);

  // Validate attachments were saved
  TestValidator.equals(
    "review has correct number of attachments",
    review.attachments.length,
    reviewInput.attachments.length,
  );
  for (let i = 0; i < reviewInput.attachments.length; ++i) {
    TestValidator.equals(
      `attachment #${i + 1} file_uri matches`,
      review.attachments[i].file_uri,
      reviewInput.attachments[i].file_uri,
    );
  }

  // Error: cannot create another review for same SKU/order_line
  await TestValidator.error(
    "cannot create duplicate review for same sku/order_line",
    async () => {
      await api.functional.shopping.customer.reviews.create(connection, {
        body: reviewInput,
      });
    },
  );
}
