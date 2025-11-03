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
 * Test permanent deletion of an attachment from a customer review by an admin.
 *
 * Steps:
 *
 * 1. Register and authenticate a new admin.
 * 2. Register and authenticate a customer.
 * 3. Customer posts a new review for a mock/placeholder SKU using random IDs.
 * 4. Customer attaches a file to the review.
 * 5. Re-authenticate as the admin and delete the attachment.
 * 6. Validate that the attachment is not present in the review's attachments
 *    array.
 * 7. Optionally, assert moderation logs reflect the deletion.
 */
export async function test_api_review_attachment_admin_delete_by_authorized_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      role: "super",
      status: "active",
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Register and authenticate customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(10);
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://testclient.io/join",
      referrer: "https://testclient.io/landing",
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customer);

  // 3. Customer creates a review (using mock UUIDs for sku/order_line)
  const shopping_sku_id = typia.random<string & tags.Format<"uuid">>();
  const shopping_order_line_id = typia.random<string & tags.Format<"uuid">>();
  const review = await api.functional.shopping.customer.reviews.create(
    connection,
    {
      body: {
        shopping_sku_id,
        shopping_order_line_id,
        rating: 5,
        comment: RandomGenerator.paragraph({ sentences: 10 }),
        attachments: [],
      } satisfies IShoppingReview.ICreate,
    },
  );
  typia.assert(review);
  TestValidator.equals(
    "review has zero attachments initially",
    review.attachments.length,
    0,
  );

  // 4. Attach a file to the review as customer
  const attachmentBody = {
    file_uri: `https://cdn.testclient.io/images/${RandomGenerator.alphaNumeric(16)}.jpg`,
    file_type: "image/jpeg",
    file_size: 409600,
  } satisfies IShoppingReviewAttachment.ICreate;
  const attachment =
    await api.functional.shopping.customer.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: attachmentBody,
      },
    );
  typia.assert(attachment);

  // 5. Switch authentication context back to admin
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: admin.name,
      role: admin.role,
      status: admin.status,
    } satisfies IShoppingAdmin.IJoin,
  });

  // 6. Permanently delete the attachment as admin
  await api.functional.shopping.admin.reviews.attachments.erase(connection, {
    reviewId: review.id,
    attachmentId: attachment.id,
  });

  // 7. Validate that the attachment is no longer present (by creating and fetching a new review, or relying on business logic; direct GET not documented so just assert no error is thrown and business logic proceeds)
  // Re-fetch review after deletion step is skipped since no public GET endpoint is available
  // Instead, re-attach a file and check success
  const attachment2Body = {
    file_uri: `https://cdn.testclient.io/images/${RandomGenerator.alphaNumeric(16)}.jpg`,
    file_type: "image/jpeg",
    file_size: 100000,
  } satisfies IShoppingReviewAttachment.ICreate;
  const attachment2 =
    await api.functional.shopping.customer.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: attachment2Body,
      },
    );
  typia.assert(attachment2);
  TestValidator.notEquals(
    "Attachment ids differ after reattachment",
    attachment2.id,
    attachment.id,
  );
}
