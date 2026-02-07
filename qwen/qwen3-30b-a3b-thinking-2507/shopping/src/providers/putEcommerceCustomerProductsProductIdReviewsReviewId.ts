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

export async function putEcommerceCustomerProductsProductIdReviewsReviewId(props: {
  customer: CustomerPayload;
  productId: string;
  reviewId: string;
  body: IEcommerceProductReview.IUpdate;
}): Promise<IEcommerceProductReview> {
  const review = await MyGlobal.prisma.ecommerce_product_reviews.findUnique({
    where: {
      id: props.reviewId,
      customer_id: props.customer.id,
      product_id: props.productId,
      deleted_at: null,
    },
  });
  if (!review) {
    throw new HttpException(
      "Review not found or not associated with this product",
      404,
    );
  }
  if (props.body.rating < 1 || props.body.rating > 5) {
    throw new HttpException("Rating must be between 1 and 5", 400);
  }
  const updatedReview = await MyGlobal.prisma.ecommerce_product_reviews.update({
    where: { id: props.reviewId },
    data: {
      rating: props.body.rating,
      comment: props.body.comment == null ? null : props.body.comment,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: updatedReview.id,
    productId: updatedReview.product_id,
    customerId: updatedReview.customer_id,
    rating: updatedReview.rating,
    comment: updatedReview.comment,
    created_at: toISOStringSafe(updatedReview.created_at),
    updated_at: toISOStringSafe(updatedReview.updated_at),
  };
}
