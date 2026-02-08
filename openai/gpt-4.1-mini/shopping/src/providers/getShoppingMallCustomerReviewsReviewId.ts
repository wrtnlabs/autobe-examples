import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
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
}): Promise<IShoppingMallSaleReview> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
    select: {
      id: true,
      customer_id: true,
      order_id: true,
      order_item_id: true,
      rating: true,
      body: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!review) {
    throw new HttpException("Review not found", 404);
  }
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Dates are stored as strings (date-time format) in actual DB layer, so return them directly
  return {
    id: review.id,
    customer_id: review.customer_id,
    order_id: review.order_id,
    order_item_id: review.order_item_id,
    rating: review.rating,
    body: review.body === null ? null : review.body,
    created_at: review.created_at,
    updated_at: review.updated_at,
    deleted_at: review.deleted_at === null ? null : review.deleted_at,
  };
}
