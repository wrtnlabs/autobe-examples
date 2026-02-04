import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the review record by reviewId
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
    select: {
      id: true,
      customer_id: true,
      created_at: true,
      is_deleted: true,
      text: true,
      rating: true,
      product_id: true,
    },
  });
  // If review doesn't exist, return 404 Not Found
  if (!review) {
    throw new HttpException("Review not found", 404);
  }
  // Verify requester is the review author
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Review not found", 404);
  }
  // Check if deletion is within 30 days of creation
  // Convert review.created_at (string & Format<'date-time'>) to Date for comparison
  const createdDate = new Date(review.created_at);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  // If deletion is outside 30-day window, return 403 Forbidden
  if (createdDate < thirtyDaysAgo) {
    throw new HttpException(
      "Reviews can only be deleted within 30 days of creation",
      403,
    );
  }
  // If review is already deleted, return 204 No Content (idempotent)
  if (review.is_deleted) {
    return;
  }
  // Create immutable snapshot of the review state
  await MyGlobal.prisma.shopping_mall_review_snapshots.create({
    data: {
      id: review.id,
      review_id: review.id,
      customer_id: review.customer_id,
      created_at: review.created_at,
      text: review.text,
      rating: review.rating,
      is_deleted: review.is_deleted,
      actor_type: "", // Use empty string for missing actor information, not null
      version: 0, // Use 0 as initial version number, not null
      deleted_by_system: false, // Use false to indicate user-initiated deletion, not null
    },
  });
  // Mark review as deleted
  await MyGlobal.prisma.shopping_mall_reviews.update({
    where: { id: props.reviewId },
    data: { is_deleted: true },
  });
  // Emit 'ReviewDeleted' event
  // (Note: Event emission mechanism assumed to be handled by system)
  return;
}
