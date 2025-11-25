import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";

export async function getShoppingMallShoppingMallProductReviewsShoppingMallProductReviewId(props: {
  shoppingMallProductReviewId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductReview> {
  const review = await MyGlobal.prisma.shopping_mall_product_reviews.findUnique(
    {
      where: { id: props.shoppingMallProductReviewId },
    },
  );

  if (!review) {
    throw new HttpException("Product review not found", 404);
  }

  return {
    id: review.id,
    shopping_mall_product_id: review.shopping_mall_product_id,
    shopping_mall_customer_id: review.shopping_mall_customer_id,
    shopping_mall_customer_session_id: review.shopping_mall_customer_session_id,
    rating: review.rating,
    title: review.title,
    body: review.body,
    moderation_status: typia.assert<"pending" | "approved" | "rejected">(
      review.moderation_status,
    ),
    created_at: toISOStringSafe(review.created_at),
    updated_at: toISOStringSafe(review.updated_at),
    deleted_at: review.deleted_at ? toISOStringSafe(review.deleted_at) : null,
  };
}
