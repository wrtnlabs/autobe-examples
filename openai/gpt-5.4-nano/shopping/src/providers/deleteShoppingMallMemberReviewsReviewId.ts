import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallMemberReviewsReviewId(props: {
  member: MemberPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  const nowIso = toISOStringSafe(new Date()) satisfies string &
    tags.Format<"date-time">;
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: {
      id: true,
      deleted_at: true,
      updated_at: true,
      shopping_mall_customer_id: true,
      shopping_mall_order_item_id: true,
    },
  });
  if (review.shopping_mall_customer_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (review.deleted_at !== null) return;
  await MyGlobal.prisma.$transaction(async (tx) => {
    const updated = await tx.shopping_mall_reviews.update({
      where: { id: props.reviewId },
      data: {
        deleted_at: toISOStringSafe(new Date()) as any,
        updated_at: toISOStringSafe(new Date()) as any,
      },
      select: { id: true },
    });
    const maxSeq = await tx.shopping_mall_review_snapshots_indices.aggregate({
      _max: { snapshot_sequence: true },
      where: { review_id: updated.id },
    });
    const nextSeq = (maxSeq._max.snapshot_sequence ?? 0) + 1;
    const snapshot = await tx.shopping_mall_snapshots.create({
      data: {
        id: v4() satisfies string & tags.Format<"uuid"> as any,
        snapshot_code: "review_delete" as any,
        source_type: "review" as any,
        source_entity_id: updated.id,
        source_order_item_id: null,
        reason: "delete" as any,
        created_by_member_id: props.member.id,
        created_at: nowIso as any,
        updated_at: nowIso as any,
        deleted_at: null,
      },
      select: { id: true },
    });
    await tx.shopping_mall_review_snapshots_indices.create({
      data: {
        id: v4() satisfies string & tags.Format<"uuid"> as any,
        shopping_mall_snapshot_id: snapshot.id,
        review_id: updated.id,
        action_type: "deleted" as any,
        snapshot_sequence: nextSeq,
        created_at: nowIso as any,
        updated_at: nowIso as any,
        deleted_at: null,
      },
    });
  });
}
