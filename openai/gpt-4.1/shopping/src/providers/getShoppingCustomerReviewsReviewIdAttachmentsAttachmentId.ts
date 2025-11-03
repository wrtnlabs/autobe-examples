import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingReviewAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAttachment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingCustomerReviewsReviewIdAttachmentsAttachmentId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingReviewAttachment> {
  // Fetch the review; must exist, not deleted, and owned by customer
  const review = await MyGlobal.prisma.shopping_reviews.findFirst({
    where: {
      id: props.reviewId,
      deleted_at: null,
      shopping_customer_id: props.customer.id,
    },
  });
  if (!review) {
    throw new HttpException("Review not found or not accessible", 404);
  }
  // Fetch the attachment by id and review id, not soft deleted
  const attachment =
    await MyGlobal.prisma.shopping_review_attachments.findFirst({
      where: {
        id: props.attachmentId,
        shopping_review_id: props.reviewId,
        deleted_at: null,
      },
    });
  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }
  const result: IShoppingReviewAttachment = {
    id: attachment.id,
    shopping_review_id: attachment.shopping_review_id,
    file_uri: attachment.file_uri,
    file_type: attachment.file_type,
    file_size: attachment.file_size,
    created_at: toISOStringSafe(attachment.created_at),
    deleted_at:
      attachment.deleted_at !== null && attachment.deleted_at !== undefined
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
  return result;
}
