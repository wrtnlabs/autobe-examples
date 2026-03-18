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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminReviewsReviewIdSnapshotIndicesSnapshotIndexId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  snapshotIndexId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewSnapshotsIndex> {
  const index =
    await MyGlobal.prisma.shopping_mall_review_snapshots_indices.findFirst({
      where: {
        id: props.snapshotIndexId,
        review_id: props.reviewId,
      },
      select: {
        id: true,
        shopping_mall_snapshot_id: true,
        review_id: true,
        action_type: true,
        snapshot_sequence: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (index === null) {
    throw new HttpException("Not Found", 404);
  }
  const snapshot = await MyGlobal.prisma.shopping_mall_snapshots.findFirst({
    where: {
      id: index.shopping_mall_snapshot_id,
      deleted_at: null,
    },
    select: {
      id: true,
      deleted_at: true,
      snapshotParties: {
        where: {
          party_type: "admin",
          party_id: props.admin.id,
          can_view: true,
          deleted_at: null,
        },
        select: { id: true },
      },
    },
  });
  if (snapshot === null) {
    throw new HttpException("Not Found", 404);
  }
  if (snapshot.snapshotParties.length === 0) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: index.id,
    shoppingMallSnapshotId: index.shopping_mall_snapshot_id,
    reviewId: index.review_id,
    actionType: index.action_type,
    snapshotSequence: index.snapshot_sequence,
    createdAt: index.created_at.toISOString(),
    updatedAt: index.updated_at.toISOString(),
    deletedAt: index.deleted_at?.toISOString() ?? null,
  };
}
