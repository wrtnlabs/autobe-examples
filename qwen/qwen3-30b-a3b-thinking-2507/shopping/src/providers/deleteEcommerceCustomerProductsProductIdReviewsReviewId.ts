import { IEcommerceProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceCustomerProductsProductIdReviewsReviewId(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IEcommerceProductReview> {
  const review = await MyGlobal.prisma.ecommerce_product_reviews.findUnique({
    where: { id: props.reviewId },
  });
  if (!review) throw new HttpException("Review not found", 404);
  if (review.product_id !== props.productId) {
    throw new HttpException("Review does not belong to this product", 404);
  }
  const updatedReview = await MyGlobal.prisma.ecommerce_product_reviews.update({
    where: { id: props.reviewId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: updatedReview.id,
    product_id: updatedReview.product_id,
    customer_id: updatedReview.customer_id,
    rating: updatedReview.rating,
    comment: updatedReview.comment,
    created_at: toISOStringSafe(updatedReview.created_at),
    updated_at: toISOStringSafe(updatedReview.updated_at),
    deleted_at: updatedReview.deleted_at
      ? toISOStringSafe(updatedReview.deleted_at)
      : null,
  };
}
