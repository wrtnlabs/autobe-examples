import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallReviewTransformer } from "../transformers/ShoppingMallReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.IUpdate;
}): Promise<IShoppingMallReview> {
  // 1. Find the review and verify it exists
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: {
      id: true,
      shopping_customer_id: true,
      deleted_at: true,
      shopping_order_item_id: true,
      rating: true,
      content: true,
      created_at: true,
      updated_at: true,
    },
  });
  // 2. Verify the customer owns this review
  if (review.shopping_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Verify the review is not deleted
  if (review.deleted_at !== null) {
    throw new HttpException("Review is deleted", 400);
  }
  // 4. Create a snapshot before updating
  await MyGlobal.prisma.shopping_mall_review_snapshots.create({
    data: {
      id: v4(),
      review: { connect: { id: review.id } },
      snapshot_data: JSON.stringify({
        id: review.id,
        shopping_order_item_id: review.shopping_order_item_id,
        shopping_customer_id: review.shopping_customer_id,
        rating: review.rating,
        content: review.content,
        created_at: toISOStringSafe(review.created_at),
        updated_at: toISOStringSafe(review.updated_at),
        deleted_at: review.deleted_at,
      }),
      created_at: new Date(),
    },
  });
  // 5. Build update data with optional fields
  const updateData: Prisma.shopping_mall_reviewsUpdateInput = {
    updated_at: new Date(),
    ...(props.body.rating !== undefined && { rating: props.body.rating }),
    ...(props.body.content !== undefined && { content: props.body.content }),
  };
  // 6. Update the review
  await MyGlobal.prisma.shopping_mall_reviews.update({
    where: { id: props.reviewId },
    data: updateData,
  });
  // 7. Recalculate average rating for the product
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: review.shopping_order_item_id },
    select: { product_snapshot: true },
  });
  if (orderItem?.product_snapshot) {
    const productData = JSON.parse(orderItem.product_snapshot);
    const productId = productData.id;
    const orderItemIds =
      await MyGlobal.prisma.shopping_mall_order_items.findMany({
        where: {
          product_snapshot: {
            contains: JSON.stringify({ id: productId }),
          },
        },
        select: { id: true },
      });
    const reviews = await MyGlobal.prisma.shopping_mall_reviews.findMany({
      where: {
        shopping_order_item_id: { in: orderItemIds.map((i) => i.id) },
        deleted_at: null,
      },
      select: { rating: true },
    });
    if (reviews.length > 0) {
      const avgRating =
        reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      // Note: Average rating would be cached/updated in product cache if applicable
    }
  }
  // 8. Fetch and return the updated review
  const updatedReview =
    await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
      where: { id: props.reviewId },
      ...ShoppingMallReviewTransformer.select(),
    });
  return await ShoppingMallReviewTransformer.transform(updatedReview);
}
