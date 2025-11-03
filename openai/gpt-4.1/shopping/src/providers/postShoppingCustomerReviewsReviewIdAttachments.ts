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

export async function postShoppingCustomerReviewsReviewIdAttachments(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingReviewAttachment.ICreate;
}): Promise<IShoppingReviewAttachment> {
  // Step 1: Find the review, verify authorship, status, and visibility
  const review = await MyGlobal.prisma.shopping_reviews.findFirst({
    where: {
      id: props.reviewId,
      shopping_customer_id: props.customer.id,
      deleted_at: null,
      state: "visible",
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
  if (!review)
    throw new HttpException("Review not found or not accessible", 404);

  // Step 2: Create the attachment
  const now = toISOStringSafe(new Date());
  const attachment = await MyGlobal.prisma.shopping_review_attachments.create({
    data: {
      id: v4(),
      shopping_review_id: props.reviewId,
      file_uri: props.body.file_uri,
      file_type: props.body.file_type,
      file_size: props.body.file_size,
      created_at: now,
    },
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

  // Step 3: Return in API structure (all dates as string & tags.Format<'date-time'>)
  return {
    id: attachment.id,
    shopping_review_id: attachment.shopping_review_id,
    file_uri: attachment.file_uri,
    file_type: attachment.file_type,
    file_size: attachment.file_size,
    created_at: toISOStringSafe(attachment.created_at),
    deleted_at:
      attachment.deleted_at === null || attachment.deleted_at === undefined
        ? undefined
        : toISOStringSafe(attachment.deleted_at),
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
