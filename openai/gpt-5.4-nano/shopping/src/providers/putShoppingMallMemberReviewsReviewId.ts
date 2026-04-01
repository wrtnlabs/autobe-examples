import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallReviewTransformer } from "../transformers/ShoppingMallReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallMemberReviewsReviewId(props: {
  member: MemberPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.IUpdate;
}): Promise<IShoppingMallReview> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
    select: {
      shopping_mall_order_item_id: true,
      shopping_mall_customer_id: true,
      deleted_at: true,
      rating: true,
      body: true,
      is_public: true,
    },
  });
  if (review === null) {
    throw new HttpException("Review not found", 404);
  }
  if (review.shopping_mall_customer_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (review.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: review.shopping_mall_order_item_id },
      select: { line_item_status: true },
    });
  if (orderItem.line_item_status !== "delivered") {
    throw new HttpException("Review can be edited only after delivery", 400);
  }
  const bodyAfter =
    props.body.body !== undefined ? props.body.body : review.body;
  const isPublicAfter =
    props.body.is_public !== undefined
      ? props.body.is_public
      : review.is_public;
  const payloadAfter = {
    rating: props.body.rating,
    body: bodyAfter,
    is_public: isPublicAfter,
  };
  const updatedReview = await MyGlobal.prisma.$transaction(async (tx) => {
    const maxIndex = await tx.shopping_mall_review_snapshots_indices.findFirst({
      where: { review_id: props.reviewId },
      orderBy: { snapshot_sequence: "desc" },
      select: { snapshot_sequence: true },
    });
    const nextSnapshotSequence = (maxIndex?.snapshot_sequence ?? 0) + 1;
    const now = new globalThis.Date();
    const snapshot = await tx.shopping_mall_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        snapshot_code: v4(),
        source_type: "review",
        source_entity_id: props.reviewId,
        source_order_item_id: review.shopping_mall_order_item_id,
        source_seller_id: null,
        source_order_id: null,
        source_review_id: props.reviewId,
        created_by_member_id: props.member.id,
        reason: "edit",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    await tx.shopping_mall_snapshot_payloads.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_snapshot_id: snapshot.id,
        payload: JSON.stringify(payloadAfter),
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    await tx.shopping_mall_review_snapshots_indices.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_snapshot_id: snapshot.id,
        review_id: props.reviewId,
        action_type: "edit",
        snapshot_sequence: nextSnapshotSequence,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    await tx.shopping_mall_reviews.update({
      where: { id: props.reviewId },
      data: {
        rating: props.body.rating,
        ...(props.body.body !== undefined ? { body: props.body.body } : {}),
        ...(props.body.is_public !== undefined
          ? { is_public: props.body.is_public }
          : {}),
        updated_at: now,
      },
    });
    const refreshed = await tx.shopping_mall_reviews.findUniqueOrThrow({
      where: { id: props.reviewId },
      ...ShoppingMallReviewTransformer.select(),
    });
    return await ShoppingMallReviewTransformer.transform(refreshed);
  });
  return updatedReview;
}
