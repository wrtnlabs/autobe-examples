import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingReviewAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAttachment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingAdminReviewsReviewIdAttachments(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingReviewAttachment.ICreate;
}): Promise<IShoppingReviewAttachment> {
  // Check review existence, active/visible, not deleted
  const review = await MyGlobal.prisma.shopping_reviews.findFirst({
    where: { id: props.reviewId, deleted_at: null, state: "visible" },
  });
  if (!review) {
    throw new HttpException("Review not found or not visible", 404);
  }

  // Per-review attachment count (limit: 10)
  const count = await MyGlobal.prisma.shopping_review_attachments.count({
    where: { shopping_review_id: props.reviewId, deleted_at: null },
  });
  if (count >= 10) {
    throw new HttpException(
      "Maximum number of attachments for this review reached",
      400,
    );
  }

  // Validate file type (simple whitelist)
  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "video/mp4",
    "application/pdf",
  ];
  if (!allowedTypes.includes(props.body.file_type)) {
    throw new HttpException("Unsupported file type", 400);
  }

  // File size limit: 5MB (5242880 bytes)
  if (props.body.file_size > 5242880 || props.body.file_size < 1) {
    throw new HttpException("File size exceeds limit or invalid", 400);
  }

  // Create attachment row
  const now = toISOStringSafe(new Date());
  const id = v4();
  const created = await MyGlobal.prisma.shopping_review_attachments.create({
    data: {
      id: id,
      shopping_review_id: props.reviewId,
      file_uri: props.body.file_uri,
      file_type: props.body.file_type,
      file_size: props.body.file_size,
      created_at: now,
      deleted_at: null,
    },
  });

  // Embed minimal parent review info (IReviewSummary)
  const reviewSummary = {
    id: review.id,
    shopping_customer_id: review.shopping_customer_id,
    shopping_sku_id: review.shopping_sku_id,
    rating: review.rating,
    comment: review.comment,
    state: review.state,
    created_at: toISOStringSafe(review.created_at),
  };

  return {
    id: created.id,
    shopping_review_id: created.shopping_review_id,
    file_uri: created.file_uri,
    file_type: created.file_type,
    file_size: created.file_size,
    created_at: toISOStringSafe(created.created_at),
    deleted_at:
      created.deleted_at != null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
    shopping_review: reviewSummary,
  };
}
