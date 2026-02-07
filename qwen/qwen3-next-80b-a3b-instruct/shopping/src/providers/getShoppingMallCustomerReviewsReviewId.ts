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

export async function getShoppingMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReview> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
    select: {
      id: true,
      shopping_mall_product_id: true,
      shopping_mall_order_item_id: true,
      shopping_mall_customer_id: true,
      rating: true,
      text: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      snapshots: {
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          review_id: true,
          actor_id: true,
          rating: true,
          text: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          actor_type: true,
        },
      },
    },
  });
  if (!review) throw new HttpException("Review not found", 404);
  // Ensure review belongs to current customer
  if (review.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Review not accessible", 403);
  }
  return {
    id: review.id,
    shopping_mall_product_id: review.shopping_mall_product_id,
    shopping_mall_order_item_id: review.shopping_mall_order_item_id,
    shopping_mall_customer_id: review.shopping_mall_customer_id,
    rating: review.rating,
    text: review.text,
    created_at: toISOStringSafe(review.created_at),
    updated_at: review.updated_at
      ? toISOStringSafe(review.updated_at)
      : undefined,
    deleted_at: review.deleted_at
      ? toISOStringSafe(review.deleted_at)
      : undefined,
    snapshots: review.snapshots.map((snapshot) => ({
      id: snapshot.id,
      review_id: snapshot.review_id,
      actor_id: snapshot.actor_id,
      rating: snapshot.rating,
      text: snapshot.text,
      created_at: toISOStringSafe(snapshot.created_at),
      updated_at: toISOStringSafe(snapshot.updated_at),
      deleted_at: snapshot.deleted_at
        ? toISOStringSafe(snapshot.deleted_at)
        : undefined,
      actor_type: snapshot.actor_type,
    })),
  };
}
