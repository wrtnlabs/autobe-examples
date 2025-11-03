import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReview";
import { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { IShoppingReviewAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAttachment";
import { IShoppingReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewModeration";
import { IShoppingReviewAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAbuseReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminReviewsReviewId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IShoppingReview> {
  // 1. Find review by PK and enforce not deleted
  const review = await MyGlobal.prisma.shopping_reviews.findUnique({
    where: { id: props.reviewId },
  });
  if (!review || review.deleted_at !== null) {
    throw new HttpException("Review not found", 404);
  }

  // 2. Lookup customer summary for review author
  const customer = await MyGlobal.prisma.shopping_customers.findUnique({
    where: { id: review.shopping_customer_id },
  });
  if (!customer) {
    throw new HttpException("Reviewer not found", 500);
  }
  const customerSummary = {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    is_active: customer.is_active,
    created_at: toISOStringSafe(customer.created_at),
    deleted_at: customer.deleted_at
      ? toISOStringSafe(customer.deleted_at)
      : null,
  };

  // 3. SKU summary for reviewed SKU
  const sku = await MyGlobal.prisma.shopping_skus.findUnique({
    where: { id: review.shopping_sku_id },
  });
  if (!sku) {
    throw new HttpException("SKU not found", 500);
  }
  const skuSummary = {
    id: sku.id,
    sku_code: sku.sku_code,
    price: sku.price,
    is_active: sku.is_active,
    status: sku.status,
  };

  // 4. Attachments (active only)
  const attachmentsRows =
    await MyGlobal.prisma.shopping_review_attachments.findMany({
      where: { shopping_review_id: review.id, deleted_at: null },
      orderBy: { created_at: "asc" },
    });
  const attachments = attachmentsRows.map((att) => ({
    id: att.id,
    shopping_review_id: att.shopping_review_id,
    file_uri: att.file_uri,
    file_type: att.file_type,
    file_size: att.file_size,
    created_at: toISOStringSafe(att.created_at),
    deleted_at: undefined,
    shopping_review: undefined,
  }));

  // 5. Moderation logs
  const moderationRows =
    await MyGlobal.prisma.shopping_review_moderations.findMany({
      where: { shopping_review_id: review.id },
      orderBy: { created_at: "asc" },
    });
  const moderation =
    moderationRows.length > 0
      ? moderationRows.map((m) => ({
          id: m.id,
          shopping_review_id: m.shopping_review_id,
          moderator_admin_id: m.moderator_admin_id,
          action: m.action,
          reason: m.reason ?? undefined,
          created_at: toISOStringSafe(m.created_at),
        }))
      : undefined;

  // 6. Abuse reports
  const abuseRows =
    await MyGlobal.prisma.shopping_review_abuse_reports.findMany({
      where: { shopping_review_id: review.id },
      orderBy: { created_at: "asc" },
    });
  const abuse_reports =
    abuseRows.length > 0
      ? abuseRows.map((a) => ({
          id: a.id,
          shopping_review_id: a.shopping_review_id,
          reporter_customer_id: a.reporter_customer_id,
          report_type: a.report_type,
          comment: a.comment ?? undefined,
          state: a.state,
          created_at: toISOStringSafe(a.created_at),
          updated_at: toISOStringSafe(a.updated_at),
          deleted_at: a.deleted_at ? toISOStringSafe(a.deleted_at) : undefined,
        }))
      : undefined;

  // 7. Assemble the response strictly for DTO
  return {
    id: review.id,
    customer: customerSummary,
    sku: skuSummary,
    order_line_id: review.shopping_order_line_id,
    rating: review.rating,
    comment: review.comment,
    state: typia.assert<
      "removed" | "visible" | "pending_moderation" | "under_review"
    >(review.state),
    created_at: toISOStringSafe(review.created_at),
    updated_at: toISOStringSafe(review.updated_at),
    deleted_at: review.deleted_at
      ? toISOStringSafe(review.deleted_at)
      : undefined,
    attachments,
    moderation,
    abuse_reports,
  };
}
