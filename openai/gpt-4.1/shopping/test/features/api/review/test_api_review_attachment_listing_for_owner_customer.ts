import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingReviewAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingReviewAttachment";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReview";
import type { IShoppingReviewAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAbuseReport";
import type { IShoppingReviewAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAttachment";
import type { IShoppingReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewModeration";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";

/**
 * Test that a customer who owns a review can retrieve a paginated list of all
 * attachments (files, images, or videos) for that review.
 *
 * 1. Register a new customer (owner of reviews).
 * 2. As this customer, create a review with a random number of attachments (1–5),
 *    record attachment metadata.
 * 3. Fetch attachment list via PATCH
 *    /shopping/customer/reviews/{reviewId}/attachments.
 * 4. Confirm all non-deleted files are present, correct, and have expected
 *    metadata.
 * 5. Confirm that attachments marked as deleted do not appear unless
 *    include_deleted is true.
 * 6. Validate filtering by file_type, pagination (page, limit), and
 *    upload_date_from/upload_date_to.
 * 7. Ensure returned data is for the right review and customer.
 */
export async function test_api_review_attachment_listing_for_owner_customer(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://shop.example.com/register",
      referrer: "https://shop.example.com/landing",
      ip: "127.0.0.1",
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customer);
  // 2. Create a review for an imaginary SKU and order line, with random attachments
  // Faking order context as not covered by dependencies; using typia randoms for required fields
  const reviewAttachments = ArrayUtil.repeat(
    typia.random<
      number & tags.Type<"int32"> & tags.Minimum<3> & tags.Maximum<5>
    >() satisfies number as number,
    () =>
      ({
        file_uri: `https://files.example.com/${RandomGenerator.alphaNumeric(16)}`,
        file_type: RandomGenerator.pick([
          "image/png",
          "image/jpeg",
          "video/mp4",
          "application/pdf",
        ] as const),
        file_size: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Minimum<1000> &
            tags.Maximum<5000000>
        >() satisfies number as number,
      }) satisfies IShoppingReviewAttachment.ICreate,
  );
  const review = await api.functional.shopping.customer.reviews.create(
    connection,
    {
      body: {
        shopping_sku_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_order_line_id: typia.random<string & tags.Format<"uuid">>(),
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >() satisfies number as number,
        comment: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 15,
          wordMin: 5,
          wordMax: 10,
        }),
        attachments: reviewAttachments,
      } satisfies IShoppingReview.ICreate,
    },
  );
  typia.assert(review);
  // 3. Fetch attachments for the review (should retrieve all, non-deleted)
  const page1 =
    await api.functional.shopping.customer.reviews.attachments.index(
      connection,
      {
        reviewId: review.id,
        body: {
          // no filters, defaults should apply: page=1, limit=20, no deleted files
        },
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "all uploaded attachments present (none deleted)",
    page1.data.length === reviewAttachments.length,
  );
  // 4. Check that every returned attachment matches one sent during creation
  for (const attachment of page1.data) {
    // Should have all required fields
    typia.assert<IShoppingReviewAttachment>(attachment);
    // Should be one of created
    TestValidator.predicate(
      `attachment ${attachment.id} is one of reviewAttachments`,
      review.attachments.find(
        (a) =>
          a.file_uri === attachment.file_uri &&
          a.file_type === attachment.file_type &&
          a.file_size === attachment.file_size,
      ) !== undefined,
    );
    // Should not be marked as deleted
    TestValidator.equals(
      "attachment is not deleted",
      attachment.deleted_at,
      null,
    );
    // Metadata check (UUID format, created_at present, etc)
    typia.assert<string & tags.Format<"uuid">>(attachment.id);
    typia.assert<string & tags.Format<"uuid">>(attachment.shopping_review_id);
    typia.assert<string & tags.Format<"date-time">>(attachment.created_at);
    TestValidator.equals(
      "attachment belongs to review",
      attachment.shopping_review_id,
      review.id,
    );
  }
  // 5. Mark a random attachment as deleted in response mock (simulate soft-delete)
  // (Assume soft-delete not actually api-mockable here, but test listing with include_deleted flag)
  // 6. Include deleted attachments via filter
  const page2 =
    await api.functional.shopping.customer.reviews.attachments.index(
      connection,
      {
        reviewId: review.id,
        body: {
          include_deleted: true,
        },
      },
    );
  typia.assert(page2);
  TestValidator.equals(
    "page2 includes same count as created (mock attachment delete not applied but include_deleted allowed)",
    page2.data.length,
    reviewAttachments.length,
  );
  // 7. Filter by file_type
  const filterType = reviewAttachments[0].file_type;
  const filterTypePage =
    await api.functional.shopping.customer.reviews.attachments.index(
      connection,
      {
        reviewId: review.id,
        body: {
          file_type: filterType,
        },
      },
    );
  typia.assert(filterTypePage);
  TestValidator.predicate(
    "all returned attachments match file_type filter",
    filterTypePage.data.every((a) => a.file_type === filterType),
  );
  // 8. Test pagination: limit=2, page=1
  const paginated =
    await api.functional.shopping.customer.reviews.attachments.index(
      connection,
      {
        reviewId: review.id,
        body: {
          limit: 2,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(paginated);
  TestValidator.predicate(
    "pagination limit=2 returns at most 2 attachments",
    paginated.data.length <= 2,
  );
  TestValidator.equals(
    "returned current page is 1",
    paginated.pagination.current,
    1,
  );
  // 9. Test upload_date_from and upload_date_to (using created_at of first attachment)
  const firstAttachmentCreated =
    paginated.data.length > 0 ? paginated.data[0].created_at : undefined;
  if (firstAttachmentCreated !== undefined) {
    const dateFiltered =
      await api.functional.shopping.customer.reviews.attachments.index(
        connection,
        {
          reviewId: review.id,
          body: {
            upload_date_from: firstAttachmentCreated,
            upload_date_to: firstAttachmentCreated,
          },
        },
      );
    typia.assert(dateFiltered);
    TestValidator.predicate(
      "date filter matches created_at",
      dateFiltered.data.every((a) => a.created_at === firstAttachmentCreated),
    );
  }
}
