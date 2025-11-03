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
 * Validate that an admin can retrieve the metadata and URI of any review
 * attachment.
 *
 * 1. Register and authenticate an admin
 * 2. Register a customer account
 * 3. Customer creates a review (simulate random SKU/order line for test context)
 * 4. Customer uploads an attachment to the review
 * 5. Admin requests the attachment by reviewId and attachmentId
 * 6. Assert that the attachment metadata is returned properly (file_uri,
 *    file_type, etc.)
 * 7. Attempt to fetch a non-existent attachment as admin and ensure error is
 *    thrown
 */
export async function test_api_admin_review_attachment_retrieval(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role: "super",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Register a customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(10);
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        href: "https://testclient.shopping.com/registration",
        referrer: "https://testclient.shopping.com/landing",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // 3. Customer creates a review (simulate random SKU and order line id)
  const shoppingSkuId = typia.random<string & tags.Format<"uuid">>();
  const shoppingOrderLineId = typia.random<string & tags.Format<"uuid">>();
  const review: IShoppingReview =
    await api.functional.shopping.customer.reviews.create(connection, {
      body: {
        shopping_sku_id: shoppingSkuId,
        shopping_order_line_id: shoppingOrderLineId,
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        comment: RandomGenerator.paragraph({ sentences: 12 }),
        attachments: [],
      } satisfies IShoppingReview.ICreate,
    });
  typia.assert(review);

  // 4. Customer uploads an attachment to the review
  const fileUri =
    "https://cdn.testattach.com/review-file-" +
    RandomGenerator.alphaNumeric(16).toString();
  const attachmentCreate = {
    file_uri: fileUri,
    file_type: RandomGenerator.pick([
      "image/png",
      "image/jpeg",
      "video/mp4",
    ] as const),
    file_size: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingReviewAttachment.ICreate;
  const attachment: IShoppingReviewAttachment =
    await api.functional.shopping.customer.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: attachmentCreate,
      },
    );
  typia.assert(attachment);

  // 5. Admin requests the attachment (reviewId, attachmentId)
  // The session is already authenticated as admin (no need to switch)
  const adminRetrievedAttachment =
    await api.functional.shopping.admin.reviews.attachments.at(connection, {
      reviewId: review.id,
      attachmentId: attachment.id,
    });
  typia.assert(adminRetrievedAttachment);
  TestValidator.equals(
    "admin gets same attachment",
    adminRetrievedAttachment.id,
    attachment.id,
  );
  TestValidator.equals(
    "admin retrieves file_uri",
    adminRetrievedAttachment.file_uri,
    attachmentCreate.file_uri,
  );
  TestValidator.equals(
    "admin retrieves file_type",
    adminRetrievedAttachment.file_type,
    attachmentCreate.file_type,
  );
  TestValidator.equals(
    "admin retrieves file_size",
    adminRetrievedAttachment.file_size,
    attachmentCreate.file_size,
  );
  TestValidator.equals(
    "admin retrieves review ID in attachment",
    adminRetrievedAttachment.shopping_review_id,
    review.id,
  );

  // 6. Attempt to retrieve a non-existent attachment (fake UUID) as admin
  await TestValidator.error(
    "admin gets error for non-existent attachment",
    async () => {
      await api.functional.shopping.admin.reviews.attachments.at(connection, {
        reviewId: review.id,
        attachmentId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
