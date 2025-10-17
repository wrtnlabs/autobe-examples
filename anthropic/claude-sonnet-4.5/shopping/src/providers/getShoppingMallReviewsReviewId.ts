import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function getShoppingMallReviewsReviewId(props: {
  reviewId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReview> {
  const { reviewId } = props;

  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: { id: reviewId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
      shopping_mall_product_id: true,
      shopping_mall_sku_id: true,
      shopping_mall_order_id: true,
      rating: true,
      title: true,
      review_text: true,
      verified_purchase: true,
      status: true,
      helpful_count: true,
      not_helpful_count: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!review) {
    throw new HttpException("Review not found", 404);
  }

  return {
    id: review.id,
    shopping_mall_customer_id: review.shopping_mall_customer_id,
    shopping_mall_product_id: review.shopping_mall_product_id,
    shopping_mall_sku_id: review.shopping_mall_sku_id ?? undefined,
    shopping_mall_order_id: review.shopping_mall_order_id,
    rating: review.rating,
    title: review.title ?? undefined,
    review_text: review.review_text ?? undefined,
    verified_purchase: review.verified_purchase,
    status: review.status,
    helpful_count: review.helpful_count,
    not_helpful_count: review.not_helpful_count,
    created_at: toISOStringSafe(review.created_at),
    updated_at: toISOStringSafe(review.updated_at),
  };
}
