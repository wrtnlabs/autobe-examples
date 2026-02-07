import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
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

export async function deleteShoppingMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string;
}): Promise<IShoppingMallReview.ISummary> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
    select: {
      id: true,
      customer_id: true,
      order_item_id: true,
      rating: true,
      content: true,
    },
  });
  if (!review) throw new HttpException("Review not found", 404);
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Review not author", 403);
  }
  const created = await MyGlobal.prisma.shopping_mall_review_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_review_id: props.reviewId,
      customer_id: review.customer_id,
      product_id: review.order_item_id,
      rating: review.rating,
      text: review.content ?? "[review deleted]",
      created_at: toISOStringSafe(new Date()),
    },
  });
  await MyGlobal.prisma.shopping_mall_reviews.delete({
    where: { id: props.reviewId },
  });
  return {
    id: props.reviewId,
    customer_id: review.customer_id,
    order_item_id: review.order_item_id,
    rating: review.rating,
    content: review.content ?? undefined,
    created_at: toISOStringSafe(new Date()),
    updated_at: toISOStringSafe(new Date()),
  };
}
