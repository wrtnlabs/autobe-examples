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

export async function getShoppingAdminReviewsReviewIdAttachmentsAttachmentId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingReviewAttachment> {
  const review = await MyGlobal.prisma.shopping_reviews.findFirst({
    where: {
      id: props.reviewId,
      deleted_at: null,
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
  if (!review) {
    throw new HttpException("Review not found or deleted", 404);
  }

  const attachment =
    await MyGlobal.prisma.shopping_review_attachments.findFirst({
      where: {
        id: props.attachmentId,
        shopping_review_id: props.reviewId,
        deleted_at: null,
      },
    });
  if (!attachment) {
    throw new HttpException("Attachment not found or deleted", 404);
  }

  return {
    id: attachment.id,
    shopping_review_id: attachment.shopping_review_id,
    file_uri: attachment.file_uri,
    file_type: attachment.file_type,
    file_size: attachment.file_size,
    created_at: toISOStringSafe(attachment.created_at),
    deleted_at: attachment.deleted_at
      ? toISOStringSafe(attachment.deleted_at)
      : undefined,
    shopping_review: {
      id: review.id,
      shopping_customer_id: review.shopping_customer_id,
      shopping_sku_id: review.shopping_sku_id,
      rating: review.rating,
      comment: review.comment,
      state: review.state,
      created_at: toISOStringSafe(review.created_at),
    },
  };
}
