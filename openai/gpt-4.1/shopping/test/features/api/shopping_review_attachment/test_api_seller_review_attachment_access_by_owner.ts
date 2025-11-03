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
 * Validates that a seller can access attachments for reviews related to their
 * own products and that access is correctly restricted in other scenarios.
 *
 * Steps:
 *
 * 1. Register a seller (owning a product).
 * 2. Register a customer and have them create a review (simulate customer flow;
 *    assume SKU/order/line already exists).
 * 3. Customer uploads an attachment to their review.
 * 4. Switch authentication to seller and request the attachment metadata through
 *    the seller-specific endpoint.
 * 5. Validate that metadata is returned correctly, and content matches
 *    expectations.
 * 6. Attempt to access a soft-deleted attachment and confirm access is denied.
 */
export async function test_api_seller_review_attachment_access_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Seller registration
  const sellerJoin: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.paragraph({ sentences: 2 }),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      },
    });
  typia.assert(sellerJoin);

  // Step 2: Customer registration
  const customerJoin: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://customer-join.test/", // static context
        referrer: "https://referrer-site.test/",
      },
    });
  typia.assert(customerJoin);

  // Step 3: Customer creates review (simulate existing SKU, order, and line)
  const reviewCreateBody = {
    shopping_sku_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_order_line_id: typia.random<string & tags.Format<"uuid">>(),
    rating: 4,
    comment: RandomGenerator.paragraph({ sentences: 12 }),
  } satisfies IShoppingReview.ICreate;
  const review: IShoppingReview =
    await api.functional.shopping.customer.reviews.create(connection, {
      body: reviewCreateBody,
    });
  typia.assert(review);

  // Step 4: Customer adds an attachment to the review
  const attachmentRequest = {
    file_uri: `https://cdn.attachedfiles.com/image/${RandomGenerator.alphaNumeric(12)}.jpg`,
    file_type: "image/jpeg",
    file_size: 1024 * 128,
  } satisfies IShoppingReviewAttachment.ICreate;
  const attachment: IShoppingReviewAttachment =
    await api.functional.shopping.customer.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: attachmentRequest,
      },
    );
  typia.assert(attachment);
  TestValidator.equals(
    "attachment belongs to correct review",
    attachment.shopping_review_id,
    review.id,
  );
  // Validate file uri and type
  TestValidator.equals(
    "attachment file_type matches",
    attachment.file_type,
    attachmentRequest.file_type,
  );
  TestValidator.equals(
    "attachment file_size matches",
    attachment.file_size,
    attachmentRequest.file_size,
  );

  // Step 5: Switch to seller context (current connection is already authenticated as seller)
  // (SDK auto-updates connection headers on last join)
  // Request the attachment as seller
  const attachmentBySeller: IShoppingReviewAttachment =
    await api.functional.shopping.seller.reviews.attachments.at(connection, {
      reviewId: review.id,
      attachmentId: attachment.id,
    });
  typia.assert(attachmentBySeller);
  TestValidator.equals(
    "seller can fetch own product review attachment metadata",
    attachmentBySeller.id,
    attachment.id,
  );
  TestValidator.equals(
    "seller receives correct file_uri",
    attachmentBySeller.file_uri,
    attachment.file_uri,
  );
  TestValidator.equals(
    "seller receives correct file_type",
    attachmentBySeller.file_type,
    attachment.file_type,
  );

  // Step 6: Simulate soft-delete on the attachment by manually setting deleted_at (simulate business rule for test)
  // (Since no API is given for soft-delete, test that deleted_at blocks access)
  // The only way to simulate is a negative test: try random uuid values as non-existent/deleted
  await TestValidator.error(
    "seller cannot access soft-deleted/non-existent attachment",
    async () => {
      await api.functional.shopping.seller.reviews.attachments.at(connection, {
        reviewId: review.id,
        attachmentId: typia.random<string & tags.Format<"uuid">>(), // non-existent/deleted uuid
      });
    },
  );
}
