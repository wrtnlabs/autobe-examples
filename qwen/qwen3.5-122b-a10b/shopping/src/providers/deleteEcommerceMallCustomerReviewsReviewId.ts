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

export async function deleteEcommerceMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify review exists and get current state (404 if not found)
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow(
    {
      where: { id: props.reviewId },
      select: {
        id: true,
        customer_id: true,
        is_deleted: true,
        rating: true,
        content: true,
      },
    },
  );
  // Step 2: Validate ownership (403 if not owner)
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Validate not already deleted (409 if already deleted)
  if (review.is_deleted) {
    throw new HttpException("Review already deleted", 409);
  }
  // Step 4-5: Create snapshot and mark as deleted in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create snapshot record with current review state
    const snapshotId = v4() as string & tags.Format<"uuid">;
    await tx.ecommerce_mall_review_snapshots.create({
      data: {
        id: snapshotId,
        ecommerce_mall_review_id: props.reviewId,
        changed_by_customer_id: props.customer.id,
        created_at: new Date(),
        previous_values: JSON.stringify({
          rating: review.rating,
          content: review.content,
          is_deleted: false,
        }),
        current_values: JSON.stringify({
          rating: review.rating,
          content: review.content,
          is_deleted: true,
        }),
      },
    });
    // Update review to mark as deleted
    await tx.ecommerce_mall_reviews.update({
      where: { id: props.reviewId },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
  });
}
