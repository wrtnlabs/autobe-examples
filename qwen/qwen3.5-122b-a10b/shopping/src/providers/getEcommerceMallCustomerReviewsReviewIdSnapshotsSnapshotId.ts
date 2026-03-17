import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
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
import { EcommerceMallReviewSnapshotTransformer } from "../transformers/EcommerceMallReviewSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerReviewsReviewIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallReviewSnapshot> {
  // Verify the review exists and belongs to the customer (authorization check)
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow(
    {
      where: { id: props.reviewId },
      select: {
        customer_id: true,
      },
    },
  );
  // Authorization check: customer must own the review
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Retrieve the snapshot with nested review and customer relations using transformer select
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_review_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...EcommerceMallReviewSnapshotTransformer.select(),
    });
  // Verify the snapshot belongs to the specified review
  if (snapshot.review.id !== props.reviewId) {
    throw new HttpException("Not Found", 404);
  }
  // Transform and return the snapshot
  return await EcommerceMallReviewSnapshotTransformer.transform(snapshot);
}
