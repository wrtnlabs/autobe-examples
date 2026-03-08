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

export async function getShoppingMallCustomerReviewsReviewIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewSnapshot> {
  // Query snapshot with nested review for authorization check in single query
  const snapshot =
    await MyGlobal.prisma.shopping_mall_review_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        shopping_mall_review_id: true,
        rating: true,
        content: true,
        created_at: true,
        review: {
          select: { shopping_mall_customer_id: true },
        },
      },
    });
  // Verify the snapshot belongs to the specified review
  if (snapshot.shopping_mall_review_id !== props.reviewId) {
    throw new HttpException("Snapshot not found for this review", 404);
  }
  // Authorization: only the original review author can access
  if (snapshot.review.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Return snapshot with proper date formatting
  return {
    id: snapshot.id,
    review_id: snapshot.shopping_mall_review_id,
    rating: snapshot.rating,
    content: snapshot.content ?? null,
    created_at: snapshot.created_at.toISOString(),
  };
}
