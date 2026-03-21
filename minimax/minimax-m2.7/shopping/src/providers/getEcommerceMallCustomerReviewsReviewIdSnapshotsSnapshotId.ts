import { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
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

export async function getEcommerceMallCustomerReviewsReviewIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallReviewSnapshot> {
  // Query snapshot with review to verify ownership and reviewId match
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_review_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        rating: true,
        body: true,
        created_at: true,
        ecommerce_mall_review_id: true,
        review: {
          select: {
            id: true,
            ecommerce_mall_customer_id: true,
          },
        },
      },
    });
  // Validate snapshot belongs to the requested review
  if (snapshot.ecommerce_mall_review_id !== props.reviewId) {
    throw new HttpException("Not Found", 404);
  }
  // Authorization: customer can only access their own review snapshots
  if (snapshot.review.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: snapshot.id as string & tags.Format<"uuid">,
    rating: snapshot.rating,
    body: snapshot.body,
    created_at: snapshot.created_at.toISOString() as string &
      tags.Format<"date-time">,
    review_id: snapshot.review.id as string & tags.Format<"uuid">,
  };
}
