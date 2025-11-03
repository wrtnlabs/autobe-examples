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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingSellerReviewsReviewId(props: {
  seller: SellerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IShoppingReview> {
  // Fetch review by reviewId and soft-deletion
  const review = await MyGlobal.prisma.shopping_reviews.findUnique({
    where: { id: props.reviewId },
  });
  if (!review || review.deleted_at) {
    throw new HttpException("Review not found", 404);
  }

  // Get SKU and product, confirm ownership
  const sku = await MyGlobal.prisma.shopping_skus.findUnique({
    where: { id: review.shopping_sku_id },
  });
  if (!sku || sku.deleted_at) {
    throw new HttpException("Review's SKU not found", 404);
  }
  const product = await MyGlobal.prisma.shopping_products.findUnique({
    where: { id: sku.shopping_product_id },
  });
  if (!product || product.deleted_at) {
    throw new HttpException("Related product not found", 404);
  }
  if (product.shopping_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: Review is not for your product", 403);
  }

  // Fetch customer summary
  const customer = await MyGlobal.prisma.shopping_customers.findUnique({
    where: { id: review.shopping_customer_id },
  });
  if (!customer) {
    throw new HttpException("Customer not found", 404);
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

  // Map SKU summary
  const skuSummary = {
    id: sku.id,
    sku_code: sku.sku_code,
    price: sku.price,
    is_active: sku.is_active,
    status: sku.status,
  };

  // Gather attachments (excluding soft-deleted)
  const attachmentsRows =
    await MyGlobal.prisma.shopping_review_attachments.findMany({
      where: { shopping_review_id: props.reviewId, deleted_at: null },
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

  // Moderation logs
  const moderationRows =
    await MyGlobal.prisma.shopping_review_moderations.findMany({
      where: { shopping_review_id: props.reviewId },
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

  // Abuse reports (exclude soft-deleted)
  const abuseReportRows =
    await MyGlobal.prisma.shopping_review_abuse_reports.findMany({
      where: { shopping_review_id: props.reviewId, deleted_at: null },
    });
  const abuse_reports =
    abuseReportRows.length > 0
      ? abuseReportRows.map((r) => ({
          id: r.id,
          shopping_review_id: r.shopping_review_id,
          reporter_customer_id: r.reporter_customer_id,
          report_type: r.report_type,
          comment: r.comment ?? undefined,
          state: r.state,
          created_at: toISOStringSafe(r.created_at),
          updated_at: toISOStringSafe(r.updated_at),
          deleted_at: undefined,
        }))
      : undefined;

  // Map state to IShoppingReview['state']
  let state: IShoppingReview["state"] =
    review.state === "pending_moderation"
      ? "pending_moderation"
      : review.state === "under_review"
        ? "under_review"
        : review.state === "removed"
          ? "removed"
          : "visible";

  return {
    id: review.id,
    customer: customerSummary,
    sku: skuSummary,
    order_line_id: review.shopping_order_line_id,
    rating: review.rating,
    comment: review.comment,
    state,
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
