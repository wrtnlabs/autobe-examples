import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingReviewAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingReviewAttachment";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReview";
import type { IShoppingReviewAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAbuseReport";
import type { IShoppingReviewAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAttachment";
import type { IShoppingReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewModeration";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";

/**
 * Validate that an authenticated admin can list all attachments for a specific
 * customer review with correct pagination and filtering support.
 *
 * Steps:
 *
 * 1. Register a new admin for authentication.
 * 2. Register a customer.
 * 3. As customer, create a review with several attachments.
 * 4. As admin, list attachments for the review and validate listings:
 *
 * - Default listing (non-deleted attachments only)
 * - Listing with file_type filter
 * - Listing with 'include_deleted' switch
 * - Listing with pagination
 */
export async function test_api_review_attachment_listing_for_admin(
  connection: api.IConnection,
) {
  // 1. Register admin account
  const admin_email = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: admin_email,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: "moderator",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Register customer account
  const customer_email = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customer_email,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://testclient.com/join",
        referrer: "https://google.com/",
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // 3. As customer, create a review with attachments
  // Generate mock SKU and order line IDs for association as the actual system should provide valid references
  const shopping_sku_id = typia.random<string & tags.Format<"uuid">>();
  const shopping_order_line_id = typia.random<string & tags.Format<"uuid">>();

  const attachments = ArrayUtil.repeat(3, () => ({
    file_uri: `https://cdn.test/${RandomGenerator.alphaNumeric(12)}`,
    file_type: RandomGenerator.pick([
      "image/png",
      "image/jpeg",
      "video/mp4",
    ] as const),
    file_size: typia.random<number & tags.Type<"int32">>(),
  }));
  const review: IShoppingReview =
    await api.functional.shopping.customer.reviews.create(connection, {
      body: {
        shopping_sku_id,
        shopping_order_line_id,
        rating: 5,
        comment: RandomGenerator.paragraph({ sentences: 20 }),
        attachments,
      } satisfies IShoppingReview.ICreate,
    });
  typia.assert(review);
  TestValidator.equals(
    "attachment count",
    review.attachments.length,
    attachments.length,
  );

  // 4. As admin, list attachments for the review
  // (a) Default listing
  const defaultList: IPageIShoppingReviewAttachment =
    await api.functional.shopping.admin.reviews.attachments.index(connection, {
      reviewId: review.id,
      body: {},
    });
  typia.assert(defaultList);
  TestValidator.equals(
    "non-deleted attachments count matches",
    defaultList.data.length,
    attachments.length,
  );

  // (b) Listing with file_type filter (use the file type of first attachment)
  const fileType = attachments[0].file_type;
  const filteredList: IPageIShoppingReviewAttachment =
    await api.functional.shopping.admin.reviews.attachments.index(connection, {
      reviewId: review.id,
      body: { file_type: fileType },
    });
  typia.assert(filteredList);
  TestValidator.predicate(
    "filtered list only contains specified file_type",
    filteredList.data.every((att) => att.file_type === fileType),
  );

  // (c) Listing with include_deleted (simulate by direct test, in real-world deleted attachments would exist after deletion ops)
  const includeDeletedList: IPageIShoppingReviewAttachment =
    await api.functional.shopping.admin.reviews.attachments.index(connection, {
      reviewId: review.id,
      body: { include_deleted: true },
    });
  typia.assert(includeDeletedList);
  TestValidator.equals(
    "include_deleted returns all attachments (no deletions yet)",
    includeDeletedList.data.length,
    attachments.length,
  );

  // (d) Listing with pagination (limit=2)
  const page1: IPageIShoppingReviewAttachment =
    await api.functional.shopping.admin.reviews.attachments.index(connection, {
      reviewId: review.id,
      body: { limit: 2, page: 1 },
    });
  typia.assert(page1);
  TestValidator.equals(
    "page 1 returns correct number of attachments",
    page1.data.length,
    Math.min(2, attachments.length),
  );
  if (attachments.length > 2) {
    const page2: IPageIShoppingReviewAttachment =
      await api.functional.shopping.admin.reviews.attachments.index(
        connection,
        {
          reviewId: review.id,
          body: { limit: 2, page: 2 },
        },
      );
    typia.assert(page2);
    TestValidator.equals(
      "page 2 returns correct number of attachments",
      page2.data.length,
      attachments.length - 2,
    );
  }
}
