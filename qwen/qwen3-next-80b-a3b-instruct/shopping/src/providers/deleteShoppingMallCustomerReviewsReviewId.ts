import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
  });
  if (!review) {
    throw new HttpException("Review not found", 404);
  }
  if (review.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (review.deleted_at !== null) {
    throw new HttpException("Review not found", 404);
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction([
    // Create snapshot of the current review state before deletion
    MyGlobal.prisma.shopping_mall_review_snapshots.create({
      data: {
        id: v4(),
        review_id: review.id,
        actor_id: props.customer.id,
        rating: review.rating,
        text: review.text,
        created_at: review.created_at,
        updated_at: review.updated_at
          ? toISOStringSafe(review.updated_at)
          : toISOStringSafe(new Date()),
        deleted_at: now,
        actor_type: "customer",
      },
    }),
    // Mark the review as deleted and reset updated_at
    MyGlobal.prisma.shopping_mall_reviews.update({
      where: { id: review.id },
      data: {
        deleted_at: now,
        updated_at: toISOStringSafe(new Date()),
      },
    }),
  ]);
}
