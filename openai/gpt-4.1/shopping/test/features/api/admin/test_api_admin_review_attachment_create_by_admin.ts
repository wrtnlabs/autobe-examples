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
 * E2E Test that an admin can attach a file to an existing active review and the
 * attachment is correctly registered.
 *
 * 1. Register an admin with unique business email (to test admin-only access).
 * 2. Login as admin (implicit after registration), so the API connection is
 *    authenticated for admin endpoints.
 * 3. Create a product review as a customer (with plausible SKU/order
 *    line/rating/comment to make it visible and active), and retrieve the
 *    generated reviewId for testing.
 * 4. Generate plausible file metadata for attachment:
 *
 *    - File_uri: a valid url string
 *    - File_type: select from image/png, image/jpeg, application/pdf
 *    - File_size: integer under 5MB (business plausible limit for review attachment)
 * 5. Call the admin endpoint to create the review attachment using the previously
 *    obtained reviewId and file metadata.
 * 6. Assert the returned attachment is valid and that the referenced review_id
 *    matches the intended review, the file metadata is returned identically,
 *    and the attachment is present in the response.
 * 7. Negative case: attempt to attach a file exceeding the plausible size limit
 *    and verify error is thrown.
 *
 * Note: Due to available API limitations (no "get/fetch review by id" endpoint
 * imported), the test cannot reload the review to confirm the attachment's
 * presence or audit logs in the review record. Assertions are limited to
 * response data from the create endpoints.
 *
 * All API responses are checked for correct types with typia.assert(). All test
 * logic is implemented inside the main test function using only
 * template-provided imports. No extra imports or global variables are
 * introduced.
 */
export async function test_api_admin_review_attachment_create_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@business.com`,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    role: "operator",
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Create a customer review (assuming typia.random for plausible relationships)
  const reviewCreateBody = typia.random<IShoppingReview.ICreate>();
  const review = await api.functional.shopping.customer.reviews.create(
    connection,
    { body: reviewCreateBody },
  );
  typia.assert(review);
  TestValidator.equals("review must be visible", review.state, "visible");

  // 3. Generate attachment metadata
  const fileTypes = ["image/png", "image/jpeg", "application/pdf"] as const;
  const attachmentBody = {
    file_uri: `https://cdn.example.com/files/${RandomGenerator.alphaNumeric(20)}.${RandomGenerator.pick(["png", "jpg", "jpeg", "pdf"] as const)}`,
    file_type: RandomGenerator.pick(fileTypes),
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Maximum<5242880> & tags.Minimum<1>
    >() satisfies number as number,
  } satisfies IShoppingReviewAttachment.ICreate;

  const attachment =
    await api.functional.shopping.admin.reviews.attachments.create(connection, {
      reviewId: review.id,
      body: attachmentBody,
    });
  typia.assert(attachment);
  TestValidator.equals(
    "attached review id matches",
    attachment.shopping_review_id,
    review.id,
  );
  TestValidator.equals(
    "attachment file type matches input",
    attachment.file_type,
    attachmentBody.file_type,
  );
  TestValidator.equals(
    "attachment file uri matches input",
    attachment.file_uri,
    attachmentBody.file_uri,
  );
  TestValidator.equals(
    "attachment file size matches input",
    attachment.file_size,
    attachmentBody.file_size,
  );

  // 4. Negative case: file size limit exceeded
  const tooLargeAttachmentBody = {
    ...attachmentBody,
    file_size: 7_000_000, // 7MB, above plausible 5MB business limit
  } satisfies IShoppingReviewAttachment.ICreate;
  await TestValidator.error(
    "error thrown for file size limit exceeded",
    async () => {
      await api.functional.shopping.admin.reviews.attachments.create(
        connection,
        {
          reviewId: review.id,
          body: tooLargeAttachmentBody,
        },
      );
    },
  );
}
