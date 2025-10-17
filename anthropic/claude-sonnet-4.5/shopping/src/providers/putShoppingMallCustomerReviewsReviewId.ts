import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.IUpdate;
}): Promise<IShoppingMallReview> {
  const { customer, reviewId, body } = props;

  const existingReview = await MyGlobal.prisma.shopping_mall_reviews.findUnique(
    {
      where: { id: reviewId },
    },
  );

  if (!existingReview) {
    throw new HttpException("Review not found", 404);
  }

  if (existingReview.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own reviews",
      403,
    );
  }

  const createdAtTime = new Date(existingReview.created_at).getTime();
  const nowTime = Date.now();
  const daysSinceCreation = (nowTime - createdAtTime) / (1000 * 60 * 60 * 24);

  if (daysSinceCreation > 30) {
    throw new HttpException(
      "Review edit window has expired. Reviews can only be edited within 30 days of creation.",
      403,
    );
  }

  const updatedReview = await MyGlobal.prisma.shopping_mall_reviews.update({
    where: { id: reviewId },
    data: {
      ...(body.rating !== undefined && { rating: body.rating }),
      ...(body.title !== undefined && { title: body.title }),
      ...(body.review_text !== undefined && { review_text: body.review_text }),
      status: "pending_moderation",
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updatedReview.id,
    shopping_mall_customer_id: updatedReview.shopping_mall_customer_id,
    shopping_mall_product_id: updatedReview.shopping_mall_product_id,
    shopping_mall_sku_id:
      updatedReview.shopping_mall_sku_id === null
        ? null
        : updatedReview.shopping_mall_sku_id,
    shopping_mall_order_id: updatedReview.shopping_mall_order_id,
    rating: updatedReview.rating,
    title: updatedReview.title === null ? null : updatedReview.title,
    review_text:
      updatedReview.review_text === null ? null : updatedReview.review_text,
    verified_purchase: updatedReview.verified_purchase,
    status: updatedReview.status,
    helpful_count: updatedReview.helpful_count,
    not_helpful_count: updatedReview.not_helpful_count,
    created_at: toISOStringSafe(updatedReview.created_at),
    updated_at: toISOStringSafe(updatedReview.updated_at),
  };
}
