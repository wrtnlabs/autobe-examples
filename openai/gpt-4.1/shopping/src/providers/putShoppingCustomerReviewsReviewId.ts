import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReview";
import { IShoppingReviewAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAttachment";
import { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { IShoppingReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewModeration";
import { IShoppingReviewAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAbuseReport";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingReview.IUpdate;
}): Promise<IShoppingReview> {
  const { customer, reviewId, body } = props;

  // Fetch review record by ID
  const review = await MyGlobal.prisma.shopping_reviews.findUnique({
    where: { id: reviewId },
  });
  if (!review || review.deleted_at !== null) {
    throw new HttpException("Review not found", 404);
  }
  // Authorship check
  if (review.shopping_customer_id !== customer.id) {
    throw new HttpException(
      "Only the review author may edit this review.",
      403,
    );
  }
  if (review.state === "removed" || review.state === "under_review") {
    throw new HttpException("This review cannot be modified.", 403);
  }
  // Editing window: 7 days from creation
  const nowIso: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const createdMs = new Date(toISOStringSafe(review.created_at)).getTime();
  const nowMs = new Date(nowIso).getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  if (nowMs - createdMs > sevenDaysMs) {
    throw new HttpException("REVIEW_EDIT_WINDOW_EXPIRED", 403);
  }
  // Prepare patch for allowed fields
  const update: Record<string, unknown> = {
    updated_at: nowIso,
  };
  if (typeof body.rating !== "undefined") {
    update.rating = body.rating;
  }
  if (typeof body.comment !== "undefined") {
    update.comment = body.comment;
  }
  // Apply update
  const updated = await MyGlobal.prisma.shopping_reviews.update({
    where: { id: reviewId },
    data: update,
  });
  // Handle attachments replacement if provided
  if (typeof body.attachments !== "undefined") {
    await MyGlobal.prisma.shopping_review_attachments.deleteMany({
      where: { shopping_review_id: reviewId },
    });
    if (Array.isArray(body.attachments) && body.attachments.length > 0) {
      await Promise.all(
        body.attachments.map((a) =>
          MyGlobal.prisma.shopping_review_attachments.create({
            data: {
              id: v4(),
              shopping_review_id: reviewId,
              file_uri: a.file_uri,
              file_type: a.file_type,
              file_size: a.file_size,
              created_at: nowIso,
              deleted_at: null,
            },
          }),
        ),
      );
    }
  }
  // Join customer, sku, attachments, mod, abuse reports
  const [customerRow, skuRow] = await Promise.all([
    MyGlobal.prisma.shopping_customers.findUniqueOrThrow({
      where: {
        id: updated.shopping_customer_id,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.shopping_skus.findUniqueOrThrow({
      where: { id: updated.shopping_sku_id },
    }),
  ]);
  const attachments =
    await MyGlobal.prisma.shopping_review_attachments.findMany({
      where: { shopping_review_id: updated.id, deleted_at: null },
      orderBy: { created_at: "asc" },
    });
  const moderation = await MyGlobal.prisma.shopping_review_moderations.findMany(
    {
      where: { shopping_review_id: updated.id },
      orderBy: { created_at: "desc" },
    },
  );
  const abuse_reports =
    await MyGlobal.prisma.shopping_review_abuse_reports.findMany({
      where: { shopping_review_id: updated.id },
      orderBy: { created_at: "desc" },
    });
  return {
    id: updated.id,
    customer: {
      id: customerRow.id,
      name: customerRow.name,
      email: customerRow.email,
      is_active: customerRow.is_active,
      created_at: toISOStringSafe(customerRow.created_at),
      deleted_at: customerRow.deleted_at
        ? toISOStringSafe(customerRow.deleted_at)
        : null,
    },
    sku: {
      id: skuRow.id,
      sku_code: skuRow.sku_code,
      price: skuRow.price,
      is_active: skuRow.is_active,
      status: skuRow.status,
    },
    order_line_id: updated.shopping_order_line_id,
    rating: updated.rating,
    comment: updated.comment,
    state: updated.state as
      | "visible"
      | "pending_moderation"
      | "removed"
      | "under_review",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
    attachments: attachments.map((att) => ({
      id: att.id,
      shopping_review_id: att.shopping_review_id,
      file_uri: att.file_uri,
      file_type: att.file_type,
      file_size: att.file_size,
      created_at: toISOStringSafe(att.created_at),
      deleted_at:
        att.deleted_at !== null ? toISOStringSafe(att.deleted_at) : undefined,
      shopping_review: undefined,
    })),
    moderation: moderation.map((m) => ({
      id: m.id,
      shopping_review_id: m.shopping_review_id,
      moderator_admin_id: m.moderator_admin_id,
      action: m.action,
      reason: m.reason ?? undefined,
      created_at: toISOStringSafe(m.created_at),
    })),
    abuse_reports: abuse_reports.map((r) => ({
      id: r.id,
      shopping_review_id: r.shopping_review_id,
      reporter_customer_id: r.reporter_customer_id,
      report_type: r.report_type,
      comment: r.comment ?? undefined,
      state: r.state,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at:
        r.deleted_at !== null ? toISOStringSafe(r.deleted_at) : undefined,
    })),
  };
}
