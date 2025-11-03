import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingReviewAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAttachment";
import { IPageIShoppingReviewAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingReviewAttachment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminReviewsReviewIdAttachments(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingReviewAttachment.IRequest;
}): Promise<IPageIShoppingReviewAttachment> {
  const { reviewId, body } = props;
  // 1. Check review existence (must not be hard/soft deleted)
  const review = await MyGlobal.prisma.shopping_reviews.findFirst({
    where: {
      id: reviewId,
    },
    select: {
      id: true,
      shopping_customer_id: true,
      shopping_sku_id: true,
      rating: true,
      comment: true,
      state: true,
      created_at: true,
    },
  });
  if (!review) throw new HttpException("Review not found", 404);
  // Pagination: page starts at 1
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);
  // Build attachment filtering
  const where: Record<string, any> = {
    shopping_review_id: reviewId,
    ...(body.file_type && { file_type: body.file_type }),
    ...((body.upload_date_from || body.upload_date_to) && {
      created_at: {
        ...(body.upload_date_from && { gte: body.upload_date_from }),
        ...(body.upload_date_to && { lte: body.upload_date_to }),
      },
    }),
    ...(body.include_deleted ? {} : { deleted_at: null }),
  };
  // Get total count for pagination
  const total = await MyGlobal.prisma.shopping_review_attachments.count({
    where,
  });
  // Get paged attachments with parent review info
  const rows = await MyGlobal.prisma.shopping_review_attachments.findMany({
    where,
    orderBy: { created_at: "desc" },
    skip,
    take: Number(limit),
    select: {
      id: true,
      shopping_review_id: true,
      file_uri: true,
      file_type: true,
      file_size: true,
      created_at: true,
      deleted_at: true,
    },
  });
  // Map to strict DTO
  const data = rows.map((att) => ({
    id: att.id,
    shopping_review_id: att.shopping_review_id,
    file_uri: att.file_uri,
    file_type: att.file_type,
    file_size: att.file_size,
    created_at: toISOStringSafe(att.created_at),
    deleted_at: att.deleted_at ? toISOStringSafe(att.deleted_at) : undefined,
    shopping_review: {
      id: review.id,
      shopping_customer_id: review.shopping_customer_id,
      shopping_sku_id: review.shopping_sku_id,
      rating: review.rating,
      comment: review.comment,
      state: review.state,
      created_at: toISOStringSafe(review.created_at),
    },
  }));
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
