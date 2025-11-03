import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingReviewAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAttachment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingSellerReviewsReviewIdAttachmentsAttachmentId(props: {
  seller: SellerPayload;
  reviewId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingReviewAttachment> {
  // 1. Fetch the attachment with the specific ID and parent review relationship. Exclude soft-deleted attachment.
  const attachment =
    await MyGlobal.prisma.shopping_review_attachments.findUnique({
      where: { id: props.attachmentId },
    });
  if (!attachment || attachment.deleted_at !== null) {
    throw new HttpException("Attachment not found", 404);
  }
  // 2. Make sure the attachment is associated to the requested review, and fetch the review with the joined SKU ID.
  if (attachment.shopping_review_id !== props.reviewId) {
    throw new HttpException("Attachment not associated to the review", 404);
  }
  const review = await MyGlobal.prisma.shopping_reviews.findUnique({
    where: { id: props.reviewId },
  });
  if (!review || review.deleted_at !== null) {
    throw new HttpException("Review not found or deleted", 404);
  }
  // 3. Fetch SKU and check if seller is owner
  const sku = await MyGlobal.prisma.shopping_skus.findUnique({
    where: { id: review.shopping_sku_id },
  });
  if (!sku || sku.shopping_product_id === undefined) {
    throw new HttpException("SKU not found or invalid", 404);
  }
  // 4. Fetch product and check seller ownership by ~comparing product.shopping_seller_id to seller.id
  const product = await MyGlobal.prisma.shopping_products.findUnique({
    where: { id: sku.shopping_product_id },
  });
  if (!product || product.shopping_seller_id !== props.seller.id) {
    throw new HttpException(
      "Unauthorized: You do not own the reviewed product",
      403,
    );
  }
  // 5. Compose the review summary for embedding in attachment
  const reviewSummary: IShoppingReviewAttachment.IReviewSummary = {
    id: review.id,
    shopping_customer_id: review.shopping_customer_id,
    shopping_sku_id: review.shopping_sku_id,
    rating: review.rating,
    comment: review.comment,
    state: review.state,
    created_at: toISOStringSafe(review.created_at),
  };
  // 6. Compose and return the attachment response (with audit log if needed)
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
    shopping_review: reviewSummary,
  };
}
