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
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
      deleted_at: true,
    },
  });
  if (review === null) {
    throw new HttpException("Not Found", 404);
  }
  if (review.shopping_mall_customer_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (review.deleted_at !== null) {
    return;
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_reviews.update({
      where: { id: props.reviewId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
    const snapshot = await tx.shopping_mall_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        snapshot_code: v4(),
        source_type: "review",
        source_entity_id: props.reviewId,
        source_seller_id: null,
        source_order_id: null,
        source_order_item_id: null,
        source_review_id: props.reviewId,
        created_by_member_id: props.member.id,
        reason: "delete",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    const lastIndex = await tx.shopping_mall_review_snapshots_indices.findFirst(
      {
        where: {
          review_id: props.reviewId,
          deleted_at: null,
        },
        orderBy: {
          snapshot_sequence: "desc",
        },
        select: {
          snapshot_sequence: true,
        },
      },
    );
    const nextSequence = (lastIndex?.snapshot_sequence ?? 0) + 1;
    await tx.shopping_mall_review_snapshots_indices.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_snapshot_id: snapshot.id,
        review_id: props.reviewId,
        action_type: "deleted",
        snapshot_sequence: nextSequence,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  });
}
