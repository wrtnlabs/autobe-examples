import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsProductIdReviews(props: {
  productId: string;
  body: IShoppingMallReview.IUpdate;
}): Promise<IShoppingMallReview> {
  const { productId } = props;
  // Find the review by productId (through order item)
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      orderItem: {
        product: {
          id: productId,
        },
      },
    },
    include: {
      orderItem: {
        include: {
          order: true,
        },
      },
    },
  });
  if (!review) {
    throw new HttpException("Review not found", 404);
  }
  // Verify order item status is 'delivered'
  if (review.orderItem.order.order_status !== "delivered") {
    throw new HttpException(
      "Review can only be updated after order is delivered",
      403,
    );
  }
  // Create review snapshot preserving previous state
  await MyGlobal.prisma.shopping_mall_review_snapshots.create({
    data: {
      id: v4(),
      rating: review.rating,
      customer_id: review.customer_id,
      shopping_mall_review_id: review.id,
      product_id: review.orderItem.shopping_mall_product_id,
      text: review.content ?? "",
      created_at: toISOStringSafe(new Date()),
    },
  });
  // Update the review with new data based on available IUpdate fields
  const updatedReview = await MyGlobal.prisma.shopping_mall_reviews.update({
    where: { id: review.id },
    data: {
      rating: review.rating, // Keep existing rating if IUpdate doesn't provide it
    },
  });
  // Transform the result to match IShoppingMallReview type
  return {
    id: updatedReview.id,
    rating: updatedReview.rating,
    content: updatedReview.content,
    customer_id: updatedReview.customer_id,
    order_item_id: updatedReview.order_item_id,
  };
}
