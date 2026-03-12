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
  // Find the review and verify ownership
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: { id: true, shopping_customer_id: true, deleted_at: true },
  });
  // Verify customer owns the review
  if (review.shopping_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check review is not deleted
  if (review.deleted_at !== null) {
    throw new HttpException("Review has been deleted", 400);
  }
  // Get current review data for snapshot
  const currentReview =
    await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
      where: { id: props.reviewId },
      select: {
        id: true,
        shopping_order_item_id: true,
        shopping_customer_id: true,
        rating: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Create snapshot before update
  await MyGlobal.prisma.shopping_mall_review_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_review_id: props.reviewId,
      snapshot_data: JSON.stringify({
        id: currentReview.id,
        shopping_order_item_id: currentReview.shopping_order_item_id,
        shopping_customer_id: currentReview.shopping_customer_id,
        rating: currentReview.rating,
        content: currentReview.content,
        created_at: currentReview.created_at.toISOString(),
        updated_at: currentReview.updated_at.toISOString(),
        deleted_at: currentReview.deleted_at?.toISOString() ?? null,
      }),
      created_at: new Date(),
    },
  });
  // Update the review with provided fields
  const updateData: Prisma.shopping_mall_reviewsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.rating !== undefined) {
    updateData.rating = props.body.rating;
  }
  if (props.body.content !== undefined) {
    updateData.content = props.body.content;
  }
  await MyGlobal.prisma.shopping_mall_reviews.update({
    where: { id: props.reviewId },
    data: updateData,
  });
  // Fetch and return updated review
  const updated = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow(
    {
      where: { id: props.reviewId },
      ...ShoppingMallReviewTransformer.select(),
    },
  );
  return await ShoppingMallReviewTransformer.transform(updated);
}
