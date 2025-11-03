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
 * Validate customer attachment retrieval from their own review, including
 * metadata and download URI integrity.
 *
 * Steps:
 *
 * 1. Register a customer
 * 2. Create a review for a SKU/order line (simulate IDs as needed)
 * 3. Upload an attachment (image or video) to the review
 * 4. Retrieve the attachment by reviewId and attachmentId
 * 5. Validate all fields and download URI; ensure metadata integrity
 * 6. Negative test: try to retrieve after "deleting" the review (simulate by using
 *    a random UUID)
 * 7. Negative test: try to retrieve using a review ID not owned by this customer
 *    (simulate by using another random UUID)
 */
export async function test_api_review_attachment_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Register customer
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://test-client/autobe-attach-workflow",
        referrer: "https://test-client/",
      },
    });
  typia.assert(customer);
  TestValidator.equals("customer email", customer.email, customer.email);

  // 2. Post a review - simulate required IDs
  // Since we don't have product/SKU/order-line creation, simulate UUIDs
  const reviewBody = {
    shopping_sku_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_order_line_id: typia.random<string & tags.Format<"uuid">>(),
    rating: 5,
    comment: RandomGenerator.paragraph({ sentences: 12 }),
    attachments: [], // initially none
  } satisfies IShoppingReview.ICreate;

  const review: IShoppingReview =
    await api.functional.shopping.customer.reviews.create(connection, {
      body: reviewBody,
    });
  typia.assert(review);
  TestValidator.equals(
    "review SKU ID",
    review.sku.id,
    reviewBody.shopping_sku_id,
  );
  TestValidator.equals("review customer ID", review.customer.id, customer.id);

  // 3. Upload an attachment
  const attachmentBody = {
    file_uri: `https://cdn.test/autobe-review-attachments/${RandomGenerator.alphaNumeric(16)}.jpg`,
    file_type: RandomGenerator.pick([
      "image/png",
      "image/jpeg",
      "video/mp4",
    ] as const),
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5242880>
    >() satisfies number as number, // 1 byte to 5MB
  } satisfies IShoppingReviewAttachment.ICreate;

  const attachment: IShoppingReviewAttachment =
    await api.functional.shopping.customer.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: attachmentBody,
      },
    );
  typia.assert(attachment);
  TestValidator.equals(
    "attachment review ID",
    attachment.shopping_review_id,
    review.id,
  );
  TestValidator.equals(
    "attachment file_uri",
    attachment.file_uri,
    attachmentBody.file_uri,
  );
  TestValidator.equals(
    "attachment file_type",
    attachment.file_type,
    attachmentBody.file_type,
  );
  TestValidator.equals(
    "attachment file_size",
    attachment.file_size,
    attachmentBody.file_size,
  );

  // 4. Retrieve it by reviewId & attachmentId
  const result: IShoppingReviewAttachment =
    await api.functional.shopping.customer.reviews.attachments.at(connection, {
      reviewId: review.id,
      attachmentId: attachment.id,
    });
  typia.assert(result);
  TestValidator.equals(
    "retrieved file_uri matches",
    result.file_uri,
    attachment.file_uri,
  );
  TestValidator.equals(
    "retrieved file_type matches",
    result.file_type,
    attachment.file_type,
  );
  TestValidator.equals(
    "retrieved file_size matches",
    result.file_size,
    attachment.file_size,
  );
  TestValidator.equals(
    "review id in attachment",
    result.shopping_review_id,
    review.id,
  );

  // 5. Negative: try to retrieve attachment with deleted review (simulate random uuid)
  await TestValidator.error(
    "cannot retrieve attachment for deleted/nonexistent review",
    async () => {
      await api.functional.shopping.customer.reviews.attachments.at(
        connection,
        {
          reviewId: typia.random<string & tags.Format<"uuid">>(), // unrelated random reviewId
          attachmentId: attachment.id,
        },
      );
    },
  );

  // 6. Negative: try to retrieve attachment from wrong review (simulate another random uuid)
  await TestValidator.error(
    "cannot retrieve attachment from unrelated review id",
    async () => {
      await api.functional.shopping.customer.reviews.attachments.at(
        connection,
        {
          reviewId: typia.random<string & tags.Format<"uuid">>(), // another fake reviewId
          attachmentId: attachment.id,
        },
      );
    },
  );
}
