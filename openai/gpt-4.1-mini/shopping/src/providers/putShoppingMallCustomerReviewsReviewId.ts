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

export async function putShoppingMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleReview.IUpdate;
}): Promise<IShoppingMallSaleReview> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
  });
  if (!review) {
    throw new HttpException("Review not found", 404);
  }
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if ("rating" in props.body && typeof props.body.rating === "number") {
    if (props.body.rating < 1 || props.body.rating > 5) {
      throw new HttpException("Rating must be between 1 and 5", 400);
    }
  }
  const updated = await MyGlobal.prisma.shopping_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      rating:
        "rating" in props.body && typeof props.body.rating === "number"
          ? props.body.rating
          : undefined,
      body:
        "body" in props.body
          ? props.body.body === undefined
            ? null
            : props.body.body
          : undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: updated.id,
    rating: updated.rating,
    body: updated.body,
    customer_id: updated.customer_id,
    order_id: updated.order_id,
    order_item_id: updated.order_item_id,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
  };
}
