import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminAdminReviewsReviewId(props: {
  admin: AdminPayload;
  reviewId: string;
}): Promise<IShoppingMallReview> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
    include: {
      customer: true,
      orderItem: {
        include: {
          product: true,
        },
      },
    },
  });
  if (!review) {
    throw new HttpException("Review not found", 404);
  }
  return {
    id: review.id,
    customer_id: review.customer_id,
    order_item_id: review.order_item_id,
    rating: review.rating,
    content: review.content ?? null,
    created_at: null,
    updated_at: null,
    customer: {
      id: review.customer.id,
      email: review.customer.email,
      name: review.customer.display_name,
      created_at: toISOStringSafe(review.customer.created_at),
      updated_at: toISOStringSafe(review.customer.updated_at),
    },
    orderItem: {
      id: review.orderItem.id,
      order_id: review.orderItem.shopping_mall_order_id,
      product_id: review.orderItem.shopping_mall_product_id,
      variant_id: review.orderItem.shopping_mall_product_variant_id,
      quantity: review.orderItem.quantity,
      price: review.orderItem.price,
      product_name: review.orderItem.product_name,
      variant_options: review.orderItem.variant_options,
      created_at: toISOStringSafe(review.orderItem.created_at),
      updated_at: toISOStringSafe(review.orderItem.updated_at),
      product: {
        id: review.orderItem.product.id,
        name: review.orderItem.product.name,
        price: review.orderItem.product.base_price,
        created_at: toISOStringSafe(review.orderItem.product.created_at),
        updated_at: toISOStringSafe(review.orderItem.product.updated_at),
      },
    },
  };
}
