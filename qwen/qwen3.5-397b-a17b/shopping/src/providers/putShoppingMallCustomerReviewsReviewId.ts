import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
  // Find review and verify ownership
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: {
      id: true,
      shopping_customer_id: true,
      deleted: true,
      rating: true,
      content: true,
    },
  });
  // Verify customer owns this review
  if (review.shopping_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify review is not soft deleted
  if (review.deleted) {
    throw new HttpException("Review has been deleted", 400);
  }
  // Execute snapshot creation and update atomically
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create snapshot with current state BEFORE update
    await tx.shopping_mall_review_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_review_id: review.id,
        snapshot_by_user_id: props.customer.id,
        snapshot_at: new Date(),
        created_at: new Date(),
        rating: review.rating,
        content: review.content,
      },
    });
    // Update the review with new values
    await tx.shopping_mall_reviews.update({
      where: { id: props.reviewId },
      data: {
        ...(props.body.rating !== undefined && { rating: props.body.rating }),
        ...(props.body.content !== undefined && {
          content: props.body.content,
        }),
        updated_at: new Date(),
      },
    });
  });
  // Fetch updated review with transformer selection
  const updated = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow(
    {
      where: { id: props.reviewId },
      ...ShoppingMallReviewTransformer.select(),
    },
  );
  return await ShoppingMallReviewTransformer.transform(updated);
}
