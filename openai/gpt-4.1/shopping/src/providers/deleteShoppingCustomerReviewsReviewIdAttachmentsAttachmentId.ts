import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingCustomerReviewsReviewIdAttachmentsAttachmentId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the attachment and parent review
  const attachment =
    await MyGlobal.prisma.shopping_review_attachments.findUnique({
      where: { id: props.attachmentId },
    });
  if (!attachment || attachment.shopping_review_id !== props.reviewId) {
    throw new HttpException("Attachment not found", 404);
  }

  // Fetch parent review and enforce ownership
  const review = await MyGlobal.prisma.shopping_reviews.findUnique({
    where: { id: props.reviewId },
  });
  if (!review) {
    throw new HttpException("Review not found", 404);
  }
  if (review.shopping_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Hard delete attachment
  await MyGlobal.prisma.shopping_review_attachments.delete({
    where: { id: props.attachmentId },
  });
  // Success: returns void
}
