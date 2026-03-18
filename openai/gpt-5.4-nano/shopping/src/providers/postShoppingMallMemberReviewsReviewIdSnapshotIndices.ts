import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewSnapshotsIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshotsIndex";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberReviewsReviewIdSnapshotIndices(props: {
  member: MemberPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewSnapshotsIndex> {
  const nowIso: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });
  if (review.shopping_mall_customer_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const last =
    await MyGlobal.prisma.shopping_mall_review_snapshots_indices.findFirst({
      where: { review_id: props.reviewId },
      orderBy: { snapshot_sequence: "desc" },
      select: { snapshot_sequence: true },
    });
  const nextSnapshotSequence: number & tags.Type<"int32"> =
    ((last?.snapshot_sequence ?? 0) + 1) as any;
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const snapshot = await tx.shopping_mall_snapshots.create({
      data: {
        id: v4(),
        snapshot_code: `review_${review.id}_snapshot_${nowIso}`,
        source_type: "review",
        source_entity_id: review.id,
        source_review_id: review.id,
        created_by_member_id: props.member.id,
        reason: "review_state_change",
        created_at: new Date(nowIso as unknown as string),
        updated_at: new Date(nowIso as unknown as string),
        deleted_at: null,
      },
    });
    const created = await tx.shopping_mall_review_snapshots_indices.create({
      data: {
        id: v4(),
        shopping_mall_snapshot_id: snapshot.id,
        review_id: review.id,
        action_type: "updated",
        snapshot_sequence: nextSnapshotSequence as any,
        created_at: new Date(nowIso as unknown as string),
        updated_at: new Date(nowIso as unknown as string),
        deleted_at: null,
      },
    });
    return {
      id: created.id,
      shoppingMallSnapshotId: created.shopping_mall_snapshot_id,
      reviewId: created.review_id,
      actionType: created.action_type,
      snapshotSequence: created.snapshot_sequence as any,
      createdAt: created.created_at.toISOString(),
      updatedAt: created.updated_at.toISOString(),
      deletedAt: created.deleted_at?.toISOString() ?? null,
    } satisfies IShoppingMallReviewSnapshotsIndex;
  });
}
