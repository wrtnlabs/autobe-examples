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
 * Validate that an admin can create a moderation log entry for a review and
 * that audit fields and linkage are correct. Steps:
 *
 * 1. Register a customer and create (and login as) the customer
 * 2. Create a review as the customer (all required fields)
 * 3. Register and login as admin
 * 4. As admin, submit a moderation log entry on the review (provide action +
 *    rationale)
 * 5. Assert review now has moderation entry, all audit fields and rationale are
 *    present, and moderator/admin linkage is correct
 * 6. Additional: Test that customer user is not able to perform the moderation
 *    operation
 */
export async function test_api_review_moderation_create_admin_action(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);

  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://shopping.example.com/register",
      referrer: "https://shopping.example.com/landing",
      ip: null,
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customerJoin);

  // 2. Login as customer - token is set automatically by SDK
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://shopping.example.com/login",
      referrer: "https://shopping.example.com/dashboard",
      ip: null,
    } satisfies IShoppingCustomer.ILogin,
  });

  // 3. Customer creates a review
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const orderLineId = typia.random<string & tags.Format<"uuid">>();
  const reviewInput = {
    shopping_sku_id: skuId,
    shopping_order_line_id: orderLineId,
    rating: 5,
    comment: RandomGenerator.paragraph({ sentences: 10 }),
    attachments: undefined,
  } satisfies IShoppingReview.ICreate;
  const review = await api.functional.shopping.customer.reviews.create(
    connection,
    {
      body: reviewInput,
    },
  );
  typia.assert(review);

  // 4. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      role: "super",
      status: "active",
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 5. Login as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://shopping.example.com/admin/login",
      referrer: "https://shopping.example.com/admin",
      ip: null,
    } satisfies IShoppingAdmin.ILogin,
  });

  // 6. As admin, create moderation log entry
  const moderationInput = {
    action: RandomGenerator.pick([
      "approved",
      "removed",
      "restored",
      "flagged",
      "edited",
    ] as const),
    reason: RandomGenerator.paragraph({ sentences: 7 }),
  } satisfies IShoppingReviewModeration.ICreate;
  const moderation =
    await api.functional.shopping.admin.reviews.moderations.create(connection, {
      reviewId: review.id,
      body: moderationInput,
    });
  typia.assert(moderation);

  // 7. Assert audit fields, linkage, and rationale
  TestValidator.equals(
    "moderation is linked to review",
    moderation.shopping_review_id,
    review.id,
  );
  TestValidator.equals(
    "moderation log has correct admin linkage",
    moderation.moderator_admin_id,
    adminJoin.id,
  );
  TestValidator.equals(
    "moderation action matches input",
    moderation.action,
    moderationInput.action,
  );
  TestValidator.equals(
    "moderation rationale matches input",
    moderation.reason,
    moderationInput.reason,
  );
  TestValidator.predicate(
    "created_at field is present",
    typeof moderation.created_at === "string" &&
      moderation.created_at.length > 0,
  );

  // 8. Attempt moderation as customer - should throw error
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://shopping.example.com/login",
      referrer: "https://shopping.example.com/dashboard",
      ip: null,
    } satisfies IShoppingCustomer.ILogin,
  });
  await TestValidator.error(
    "customer should not be able to create moderation log entry",
    async () => {
      await api.functional.shopping.admin.reviews.moderations.create(
        connection,
        {
          reviewId: review.id,
          body: {
            action: "approved",
            reason: "By customer, should be forbidden.",
          } satisfies IShoppingReviewModeration.ICreate,
        },
      );
    },
  );
}
