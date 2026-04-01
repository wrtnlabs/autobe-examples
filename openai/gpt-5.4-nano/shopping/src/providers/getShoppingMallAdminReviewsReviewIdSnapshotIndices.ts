import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReviewSnapshotsIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshotsIndex";
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

export async function getShoppingMallAdminReviewsReviewIdSnapshotIndices(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IPageIShoppingMallReviewSnapshotsIndex.ISummary> {
  await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: { id: true },
  });
  const indices =
    await MyGlobal.prisma.shopping_mall_review_snapshots_indices.findMany({
      where: {
        review_id: props.reviewId,
        deleted_at: null,
      },
      orderBy: [{ snapshot_sequence: "asc" }, { created_at: "asc" }],
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
  const records = indices.length;
  const limit = records;
  const pages = records === 0 ? 0 : 1;
  return {
    pagination: {
      current: 1,
      limit,
      records,
      pages,
    } satisfies IPage.IPagination,
    data: indices.map((i) => ({
      id: i.id,
      shoppingMallSnapshotId: i.shopping_mall_snapshot_id,
      reviewId: i.review_id,
      actionType: i.action_type,
      snapshotSequence: i.snapshot_sequence,
      createdAt: i.created_at.toISOString() satisfies string &
        tags.Format<"date-time">,
      updatedAt: i.updated_at.toISOString() satisfies string &
        tags.Format<"date-time">,
      deletedAt: i.deleted_at === null ? null : i.deleted_at.toISOString(),
    })),
  };
}
