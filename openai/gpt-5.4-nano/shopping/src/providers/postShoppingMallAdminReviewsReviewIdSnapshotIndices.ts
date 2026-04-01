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

export async function postShoppingMallAdminReviewsReviewIdSnapshotIndices(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewSnapshotsIndex> {
  const now = toISOStringSafe(new Date()) satisfies string &
    tags.Format<"date-time">;
  const snapshotSequenceLatest =
    await MyGlobal.prisma.shopping_mall_review_snapshots_indices.findFirst({
      where: { review_id: props.reviewId },
      orderBy: { snapshot_sequence: "desc" },
      select: { snapshot_sequence: true },
    });
  const nextSnapshotSequence =
    (snapshotSequenceLatest?.snapshot_sequence ?? 0) + 1;
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (review === null) {
    throw new HttpException("Not Found", 404);
  }
  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { id: props.admin.id, deleted_at: null },
    select: { id: true },
  });
  if (admin === null) {
    throw new HttpException("Forbidden", 403);
  }
  const actionType = "updated";
  const reason = "review snapshot index";
  const sourceType = "review";
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const snapshot = await tx.shopping_mall_snapshots.create({
      data: {
        id: v4() satisfies string & tags.Format<"uuid">,
        snapshot_code: v4() satisfies string & tags.Format<"uuid">,
        source_type: sourceType,
        source_entity_id: review.id,
        source_review_id: review.id,
        source_seller_id: null,
        source_order_id: null,
        source_order_item_id: null,
        source_cancellation_request_id: null,
        source_refund_request_id: null,
        created_by_member_id: null,
        reason,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    const created = await tx.shopping_mall_review_snapshots_indices.create({
      data: {
        id: v4() satisfies string & tags.Format<"uuid">,
        shopping_mall_snapshot_id: snapshot.id,
        review_id: review.id,
        action_type: actionType,
        snapshot_sequence: nextSnapshotSequence,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    // Avoid transformer/typia assertions for the type conversion; just return created as-is
    return created as unknown as IShoppingMallReviewSnapshotsIndex;
  });
  return result;
}
