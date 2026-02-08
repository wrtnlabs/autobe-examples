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

export async function putShoppingMallCustomerSaleReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: {
    rating: number;
    body?: string | null;
  };
}): Promise<IShoppingMallSaleReview> {
  // Find existing review
  const existing = await MyGlobal.prisma.shopping_mall_sale_reviews.findUnique({
    where: { id: props.reviewId },
  });
  if (!existing || existing.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Review not found", 404);
  }
  // Validate rating between 1 and 5
  const rating = props.body.rating;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpException("Rating must be an integer between 1 and 5", 400);
  }
  // Update with new rating and optional body, refresh updated_at
  const updated = await MyGlobal.prisma.shopping_mall_sale_reviews.update({
    where: { id: props.reviewId },
    data: {
      rating: rating,
      body: props.body.body === undefined ? null : props.body.body,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
  // Return the updated review, mapping all fields to expected shape
  return {
    id: updated.id as string & tags.Format<"uuid">,
    rating: updated.rating,
    body: updated.body === null ? null : updated.body,
    shopping_mall_customer_id: updated.shopping_mall_customer_id as string &
      tags.Format<"uuid">,
    created_at: toISOStringSafe(updated.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(updated.updated_at) as string &
      tags.Format<"date-time">,
  };
}
