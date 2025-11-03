import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReview";
import type { IShoppingReviewAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAbuseReport";
import type { IShoppingReviewAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAttachment";
import type { IShoppingReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewModeration";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";

/**
 * Validate that only administrators can permanently delete customer reviews for
 * compliance, moderation, or policy removal, regardless of review age or edit
 * window.
 *
 * Test Workflow:
 *
 * 1. Register a new admin user (platform administrator), saving credentials.
 * 2. Register a customer, saving credentials.
 * 3. As customer, create a new review (using randomized eligible payload).
 * 4. Switch to admin context and delete the review via the admin endpoint.
 * 5. (Functional only) Confirm that the call succeeds (no fetch/restore is
 *    possible).
 * 6. Switch context to customer and assert that customers cannot access the admin
 *    review deletion endpoint (must error).
 *
 * Notes:
 *
 * - Tokens and session switching are handled by the API SDK by joining with the
 *   respective actor's credentials.
 * - No product/SKU/order test setup is possible, so mock UUIDs are used for
 *   required review fields.
 */
export async function test_api_review_delete_by_admin_for_compliance(
  connection: api.IConnection,
) {
  // 1. Register admin and save credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(9) + "1Az$";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    name: RandomGenerator.name(),
    role: "compliance",
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  // 2. Register customer and save credentials
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphabets(9) + "1aZ$";
  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://example.com/shop",
    referrer: "https://referrer.com/landing",
  } satisfies IShoppingCustomer.ICreate;
  await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  // 3. As customer, create a review
  const reviewCreateBody = {
    shopping_sku_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_order_line_id: typia.random<string & tags.Format<"uuid">>(),
    rating: 5,
    comment: RandomGenerator.paragraph({ sentences: 5 }),
    attachments: ArrayUtil.repeat(
      2,
      () =>
        ({
          file_uri: "https://cdn.example.com/image.jpg",
          file_type: "image/jpeg",
          file_size: 409600,
        }) satisfies IShoppingReviewAttachment.ICreate,
    ),
  } satisfies IShoppingReview.ICreate;
  const review = await api.functional.shopping.customer.reviews.create(
    connection,
    { body: reviewCreateBody },
  );
  typia.assert(review);
  // 4. Switch to admin context and delete review
  await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  await api.functional.shopping.admin.reviews.erase(connection, {
    reviewId: review.id,
  });
  // 5. (Functional) The review is now considered permanently deleted — no way to re-fetch, so test success is API call completion.
  // 6. Switch context to customer and verify customers cannot use the admin endpoint
  await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  await TestValidator.error(
    "customer cannot delete any review via admin endpoint",
    async () => {
      await api.functional.shopping.admin.reviews.erase(connection, {
        reviewId: review.id,
      });
    },
  );
}
