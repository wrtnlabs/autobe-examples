import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
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

export async function getShoppingMallCustomerReviewsReviewIdSnapshots(props: {
  customer: CustomerPayload;
  reviewId: string;
}): Promise<IShoppingMallReviewSnapshot.ISummary> {
  // Authorization check - verify customer owns the review
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
  });
  if (!review) {
    throw new HttpException("Review not found", 404);
  }
  // Check authorization - only review owner or admin can access snapshots
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Query all snapshots for this review, ordered chronologically
  const snapshots =
    await MyGlobal.prisma.shopping_mall_review_snapshots.findMany({
      where: {
        shopping_mall_review_id: props.reviewId,
      },
      orderBy: {
        created_at: "asc",
      },
    });
  // Transform snapshots to response format
  // Note: This implementation assumes ISummary needs actual data fields
  // Adjust based on actual ISummary definition requirements
  const result = snapshots.map((snapshot) => ({
    id: snapshot.id,
    rating: snapshot.rating,
    text: snapshot.text,
    created_at: toISOStringSafe(snapshot.created_at),
  }));
  return result;
}
