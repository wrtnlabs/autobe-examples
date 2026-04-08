import { IEcommerceReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceReviewSnapshotTransformer } from "../transformers/EcommerceReviewSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdminAdminReviewsReviewIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceReviewSnapshot> {
  // Verify the review exists
  await MyGlobal.prisma.ecommerce_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
  });
  // Verify the snapshot exists and belongs to the specified review
  const record =
    await MyGlobal.prisma.ecommerce_review_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        ecommerce_review_id: props.reviewId,
      },
      ...EcommerceReviewSnapshotTransformer.select(),
    });
  return await EcommerceReviewSnapshotTransformer.transform(record);
}
