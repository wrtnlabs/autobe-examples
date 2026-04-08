import { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallReviewSnapshotTransformer } from "../transformers/EcommerceMallReviewSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerReviewsReviewIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  reviewId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallReviewSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_review_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...EcommerceMallReviewSnapshotTransformer.select(),
    });
  if (snapshot.review.id !== props.reviewId) {
    throw new HttpException(
      "Snapshot does not belong to specified review",
      404,
    );
  }
  return await EcommerceMallReviewSnapshotTransformer.transform(snapshot);
}
