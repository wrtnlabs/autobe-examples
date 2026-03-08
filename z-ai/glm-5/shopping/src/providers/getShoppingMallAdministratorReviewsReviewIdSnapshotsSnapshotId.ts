import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallReviewSnapshotTransformer } from "../transformers/ShoppingMallReviewSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorReviewsReviewIdSnapshotsSnapshotId(props: {
  administrator: AdministratorPayload;
  reviewId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_review_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...ShoppingMallReviewSnapshotTransformer.select(),
    });
  if (snapshot.shopping_mall_review_id !== props.reviewId) {
    throw new HttpException("Snapshot not found for this review", 404);
  }
  return await ShoppingMallReviewSnapshotTransformer.transform(snapshot);
}
