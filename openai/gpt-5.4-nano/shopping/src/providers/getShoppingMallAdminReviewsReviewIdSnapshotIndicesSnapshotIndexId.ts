import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewSnapshotsIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshotsIndex";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallReviewSnapshotsIndexTransformer } from "../transformers/ShoppingMallReviewSnapshotsIndexTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminReviewsReviewIdSnapshotIndicesSnapshotIndexId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  snapshotIndexId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewSnapshotsIndex> {
  const snapshotIndexRow =
    await MyGlobal.prisma.shopping_mall_review_snapshots_indices.findFirstOrThrow(
      {
        where: {
          id: props.snapshotIndexId,
          review_id: props.reviewId,
          deleted_at: null,
        },
        ...ShoppingMallReviewSnapshotsIndexTransformer.select(),
      },
    );
  // Snapshot visibility: admins can view snapshots for dispute resolution.
  // We still ensure the referenced central snapshot exists and is not soft-deleted.
  await MyGlobal.prisma.shopping_mall_snapshots.findUniqueOrThrow({
    where: { id: snapshotIndexRow.shopping_mall_snapshot_id },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  return await ShoppingMallReviewSnapshotsIndexTransformer.transform(
    snapshotIndexRow,
  );
}
