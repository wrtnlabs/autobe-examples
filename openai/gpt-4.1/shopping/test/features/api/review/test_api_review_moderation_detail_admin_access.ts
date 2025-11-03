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
 * Validate admin access to review moderation log detail retrieval by composite
 * reviewId and moderationId. Verifies:
 *
 * - Admin can create and fetch a moderation entry for an existing review.
 * - All returned moderation details (action, reason, moderator ID, timestamp)
 *   match input.
 * - Access requires admin.
 */
export async function test_api_review_moderation_detail_admin_access(
  connection: api.IConnection,
) {
  // 1. Register admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(2),
        role: "moderator",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Register customer and login as customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        href: "https://test.app/signup",
        referrer: "https://test.app/landing",
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // Prepare dummy SKUs/order lines for review eligibility
  const shopping_sku_id = typia.random<string & tags.Format<"uuid">>();
  const shopping_order_line_id = typia.random<string & tags.Format<"uuid">>();

  // 3. Customer creates a review
  const review: IShoppingReview =
    await api.functional.shopping.customer.reviews.create(connection, {
      body: {
        shopping_sku_id,
        shopping_order_line_id,
        rating: 5,
        comment: RandomGenerator.paragraph({ sentences: 15 }),
      } satisfies IShoppingReview.ICreate,
    });
  typia.assert(review);

  // 4. Switch actor: login as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://test.admin.app/login",
      referrer: "https://test.admin.app/landing",
    } satisfies IShoppingAdmin.ILogin,
  });

  // 5. Admin adds moderation log to the review
  const moderationBody = {
    action: "removed",
    reason: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IShoppingReviewModeration.ICreate;

  const moderation: IShoppingReviewModeration =
    await api.functional.shopping.admin.reviews.moderations.create(connection, {
      reviewId: review.id,
      body: moderationBody,
    });
  typia.assert(moderation);

  // 6. Retrieve moderation log (admin access)
  const moderationDetail: IShoppingReviewModeration =
    await api.functional.shopping.admin.reviews.moderations.at(connection, {
      reviewId: review.id,
      moderationId: moderation.id,
    });
  typia.assert(moderationDetail);
  // 7. Assert all moderation fields/values
  TestValidator.equals(
    "moderation review id matches",
    moderationDetail.shopping_review_id,
    review.id,
  );
  TestValidator.equals(
    "moderation id matches",
    moderationDetail.id,
    moderation.id,
  );
  TestValidator.equals(
    "moderator admin id matches",
    moderationDetail.moderator_admin_id,
    admin.id,
  );
  TestValidator.equals(
    "moderation action matches",
    moderationDetail.action,
    moderationBody.action,
  );
  TestValidator.equals(
    "moderation reason matches",
    moderationDetail.reason,
    moderationBody.reason,
  );
  TestValidator.predicate(
    "moderation has creation timestamp",
    typeof moderationDetail.created_at === "string" &&
      moderationDetail.created_at.length > 0,
  );
}
