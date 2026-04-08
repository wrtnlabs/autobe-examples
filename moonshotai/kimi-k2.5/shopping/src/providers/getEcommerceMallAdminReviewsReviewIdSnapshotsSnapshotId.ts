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

export async function getEcommerceMallAdminReviewsReviewIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  reviewId: string;
  snapshotId: string;
}): Promise<IEcommerceMallReviewSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_review_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...EcommerceMallReviewSnapshotTransformer.select(),
    });
  if (snapshot.review.id !== props.reviewId) {
    throw new HttpException(
      "Snapshot does not belong to the specified review",
      404,
    );
  }
  return await EcommerceMallReviewSnapshotTransformer.transform(snapshot);
}
