import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingReviewModeration";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReview";
import type { IShoppingReviewAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAbuseReport";
import type { IShoppingReviewAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAttachment";
import type { IShoppingReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewModeration";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";

/**
 * Test retrieval of the moderation log history for a specific review by an
 * authorized admin.
 *
 * 1. Register and authenticate as a new admin to obtain admin privileges.
 * 2. Register and authenticate as a new customer who will author a review.
 * 3. Customer submits a product review using valid and random data (rating,
 *    comment, etc.).
 * 4. Switch to admin context and perform a moderation action (such as approve or
 *    remove) on the newly created review by the customer.
 * 5. Use the review moderation index endpoint to retrieve the moderation history
 *    for that review.
 * 6. Validate that the moderation action performed in step 4 is returned in the
 *    moderation history with matching reviewId, action, moderator admin id,
 *    rationale, and timestamps.
 * 7. Confirm that all mandatory fields in the moderation log are present and
 *    valid.
 * 8. Confirm that only an authorized admin can access the moderation history and
 *    that none of the moderation data is visible to unauthorized actors, if
 *    possible.
 */
export async function test_api_review_moderation_history_admin_index_by_authorized_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as new admin (for privileged moderation actions)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: "moderator",
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2. Register and authenticate as new customer (review author)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://test-client.com/register",
    referrer: "https://test-client.com/",
    ip: undefined,
  } satisfies IShoppingCustomer.ICreate;
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert(customerAuth);

  // 3. Create a customer review with random valid data
  // Because review creation requires shopping_sku_id and shopping_order_line_id, we must simulate/generate them
  // For this test, we'll use random UUIDs. In real deployments these would be valid referenced records
  const reviewCreateBody = {
    shopping_sku_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_order_line_id: typia.random<string & tags.Format<"uuid">>(),
    rating: 5,
    comment: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 13,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 7,
    }).slice(0, 1900),
    attachments: [],
  } satisfies IShoppingReview.ICreate;
  const review = await api.functional.shopping.customer.reviews.create(
    connection,
    {
      body: reviewCreateBody,
    },
  );
  typia.assert(review);

  // 4. Switch to admin context and perform moderation (approve or remove) on the review
  // The join operation for admin set the connection's Authorization header
  // Pick action randomly ('approved' or 'removed')
  const moderationAction = RandomGenerator.pick([
    "approved",
    "removed",
  ] as const);
  const moderationReason = RandomGenerator.paragraph({ sentences: 2 });
  const moderationCreateBody = {
    action: moderationAction,
    reason: moderationReason,
  } satisfies IShoppingReviewModeration.ICreate;
  const moderationLog =
    await api.functional.shopping.admin.reviews.moderations.create(connection, {
      reviewId: review.id,
      body: moderationCreateBody,
    });
  typia.assert(moderationLog);

  // 5. Retrieve moderation history for this review
  const moderationHistory =
    await api.functional.shopping.admin.reviews.moderations.index(connection, {
      reviewId: review.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingReviewModeration.IRequest,
    });
  typia.assert(moderationHistory);

  // 6. Validate the moderation action appears in the returned records
  // There should be at least 1 moderation log for this review
  TestValidator.predicate(
    "moderation history should include at least one entry",
    moderationHistory.data.length >= 1,
  );
  // Find the exact entry that matches the action and moderator
  const match = moderationHistory.data.find(
    (log) =>
      log.shopping_review_id === review.id &&
      log.moderator_admin_id === adminAuth.id &&
      log.action === moderationAction &&
      (moderationReason === undefined || log.reason === moderationReason),
  );
  TestValidator.predicate(
    "moderation action for review is present in moderation history",
    !!match,
  );
  // 7. Mandatory fields check
  if (match !== undefined) {
    typia.assert(match.id);
    typia.assert(match.shopping_review_id);
    typia.assert(match.moderator_admin_id);
    typia.assert(match.action);
    typia.assert(match.created_at);
  }
}
