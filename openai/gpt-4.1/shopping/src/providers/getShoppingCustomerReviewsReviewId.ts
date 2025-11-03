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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IShoppingReview> {
  // 1. Fetch review, ensure ownership and not soft-deleted
  const review = await MyGlobal.prisma.shopping_reviews.findUnique({
    where: { id: props.reviewId },
  });
  if (
    !review ||
    review.shopping_customer_id !== props.customer.id ||
    review.deleted_at !== null
  ) {
    throw new HttpException("Review not found", 404);
  }

  // 2. Fetch reviewer/customer summary
  const customer = await MyGlobal.prisma.shopping_customers.findUniqueOrThrow({
    where: { id: review.shopping_customer_id },
  });
  const customerSummary = {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    is_active: customer.is_active,
    created_at: toISOStringSafe(customer.created_at),
    deleted_at:
      customer.deleted_at === null
        ? null
        : toISOStringSafe(customer.deleted_at),
  };

  // 3. Fetch SKU summary
  const sku = await MyGlobal.prisma.shopping_skus.findUniqueOrThrow({
    where: { id: review.shopping_sku_id },
  });
  const skuSummary = {
    id: sku.id,
    sku_code: sku.sku_code,
    price: sku.price,
    is_active: sku.is_active,
    status: sku.status,
  };

  // 4. Attachments: only non-deleted
  const attachmentsRaw =
    await MyGlobal.prisma.shopping_review_attachments.findMany({
      where: { shopping_review_id: review.id, deleted_at: null },
      orderBy: { created_at: "asc" },
    });
  const attachments = attachmentsRaw.map((att) => ({
    id: att.id,
    shopping_review_id: att.shopping_review_id,
    file_uri: att.file_uri,
    file_type: att.file_type,
    file_size: att.file_size,
    created_at: toISOStringSafe(att.created_at),
    deleted_at:
      att.deleted_at === null || att.deleted_at === undefined
        ? undefined
        : toISOStringSafe(att.deleted_at),
    shopping_review: undefined,
  }));

  // 5. Moderation logs (may be empty)
  const moderationRaw =
    await MyGlobal.prisma.shopping_review_moderations.findMany({
      where: { shopping_review_id: review.id },
      orderBy: { created_at: "asc" },
    });
  const moderation = moderationRaw.map((mod) => ({
    id: mod.id,
    shopping_review_id: mod.shopping_review_id,
    moderator_admin_id: mod.moderator_admin_id,
    action: mod.action,
    reason: mod.reason === null ? undefined : mod.reason,
    created_at: toISOStringSafe(mod.created_at),
  }));

  // 6. Abuse reports (only non-deleted)
  const abuseReportsRaw =
    await MyGlobal.prisma.shopping_review_abuse_reports.findMany({
      where: { shopping_review_id: review.id, deleted_at: null },
      orderBy: { created_at: "asc" },
    });
  const abuse_reports = abuseReportsRaw.map((rep) => ({
    id: rep.id,
    shopping_review_id: rep.shopping_review_id,
    reporter_customer_id: rep.reporter_customer_id,
    report_type: rep.report_type,
    comment:
      rep.comment === null || rep.comment === undefined
        ? undefined
        : rep.comment,
    state: rep.state,
    created_at: toISOStringSafe(rep.created_at),
    updated_at: toISOStringSafe(rep.updated_at),
    deleted_at:
      rep.deleted_at === null || rep.deleted_at === undefined
        ? undefined
        : toISOStringSafe(rep.deleted_at),
  }));

  // 7. Build result per IShoppingReview
  return {
    id: review.id,
    customer: customerSummary,
    sku: skuSummary,
    order_line_id: review.shopping_order_line_id,
    rating: review.rating,
    comment: review.comment,
    state: (():
      | "visible"
      | "pending_moderation"
      | "removed"
      | "under_review" => {
      if (review.state === "visible") return "visible";
      if (review.state === "pending_moderation") return "pending_moderation";
      if (review.state === "removed") return "removed";
      return "under_review";
    })(),
    created_at: toISOStringSafe(review.created_at),
    updated_at: toISOStringSafe(review.updated_at),
    deleted_at:
      review.deleted_at === null || review.deleted_at === undefined
        ? undefined
        : toISOStringSafe(review.deleted_at),
    attachments,
    moderation: moderation.length === 0 ? undefined : moderation,
    abuse_reports: abuse_reports.length === 0 ? undefined : abuse_reports,
  };
}
