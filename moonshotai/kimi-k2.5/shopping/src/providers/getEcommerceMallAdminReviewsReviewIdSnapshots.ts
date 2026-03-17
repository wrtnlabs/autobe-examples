import { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallReviewSnapshotTransformer } from "../transformers/EcommerceMallReviewSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminReviewsReviewIdSnapshots(props: {
  admin: AdminPayload;
  reviewId: string;
}): Promise<IEcommerceMallReviewSnapshot[]> {
  // Verify review exists
  await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
  });
  // Fetch snapshots ordered by creation time (newest first)
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_review_snapshots.findMany({
      where: { ecommerce_mall_review_id: props.reviewId },
      orderBy: { created_at: "desc" },
      ...EcommerceMallReviewSnapshotTransformer.select(),
    });
  // Transform to DTO format
  return await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallReviewSnapshotTransformer.transform,
  );
}
