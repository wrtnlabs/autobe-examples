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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallMemberReviewsReviewId(props: {
  member: MemberPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.IUpdate;
}): Promise<IShoppingMallReview> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: {
      id: true,
      shopping_mall_order_item_id: true,
      shopping_mall_customer_id: true,
      rating: true,
      body: true,
      is_public: true,
      deleted_at: true,
      created_at: true,
      updated_at: true,
      orderItem: { select: { line_item_status: true } } as any,
    } as any,
  } as any);
  if (review.shopping_mall_customer_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (review.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: review.shopping_mall_order_item_id },
      select: { id: true, line_item_status: true },
    });
  if (orderItem.line_item_status !== "delivered") {
    throw new HttpException("Review not editable", 400);
  }
  if (!(props.body.rating >= 1 && props.body.rating <= 5)) {
    throw new HttpException("Invalid rating", 400);
  }
  const nextBody =
    props.body.body === undefined ? review.body : props.body.body;
  const nextIsPublic =
    props.body.is_public === undefined
      ? review.is_public
      : props.body.is_public;
  await MyGlobal.prisma.$transaction(async (tx) => {
    const currentMax =
      await tx.shopping_mall_review_snapshots_indices.aggregate({
        _max: { snapshot_sequence: true },
        where: { review_id: props.reviewId },
      });
    const nextSequence = (currentMax._max.snapshot_sequence ?? 0) + 1;
    const snapshot = await tx.shopping_mall_snapshots.create({
      data: {
        id: v4(),
        snapshot_code: `review-edit-${props.reviewId}-${nextSequence}`,
        source_type: "review",
        source_entity_id: props.reviewId,
        source_order_item_id: review.shopping_mall_order_item_id,
        source_review_id: props.reviewId,
        created_by_member_id: props.member.id,
        reason: "edit",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    await tx.shopping_mall_snapshot_payloads.create({
      data: {
        id: v4(),
        shopping_mall_snapshot_id: snapshot.id,
        payload: typia.json.stringify({
          rating: props.body.rating,
          body: nextBody,
          is_public: nextIsPublic,
        }),
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    await tx.shopping_mall_review_snapshots_indices.create({
      data: {
        id: v4(),
        shopping_mall_snapshot_id: snapshot.id,
        review_id: props.reviewId,
        action_type: "edit",
        snapshot_sequence: nextSequence,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    await tx.shopping_mall_reviews.update({
      where: { id: props.reviewId },
      data: {
        rating: props.body.rating,
        ...(props.body.body !== undefined ? { body: nextBody } : {}),
        ...(props.body.is_public !== undefined
          ? { is_public: nextIsPublic }
          : {}),
        updated_at: new Date(),
      },
    });
  });
  const updated = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow(
    {
      where: { id: props.reviewId },
      select: {
        id: true,
        rating: true,
        body: true,
        is_public: true,
        shopping_mall_order_item_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            is_featured: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            seller: {
              select: {
                id: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                description: true,
                slug: true,
                visibility: true,
                display_order: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                parent_category_id: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
          },
        },
      },
    },
  );
  return {
    id: updated.id,
    rating: updated.rating,
    body: updated.body ?? null,
    is_public: updated.is_public,
    orderItem: updated.shopping_mall_order_item_id,
    product: {
      id: updated.product.id,
      code: updated.product.code,
      name: updated.product.name,
      description: updated.product.description,
      is_featured: updated.product.is_featured,
      seller: {
        id: updated.product.seller.id,
      } satisfies IShoppingMallMember.ISummary,
      category: {
        id: updated.product.category.id,
        name: updated.product.category.name,
        description: updated.product.category.description,
        slug: updated.product.category.slug,
        visibility: updated.product.category.visibility,
        display_order: updated.product.category.display_order,
        created_at: toISOStringSafe(updated.product.category.created_at),
        updated_at: toISOStringSafe(updated.product.category.updated_at),
        deleted_at:
          updated.product.category.deleted_at === null
            ? null
            : toISOStringSafe(updated.product.category.deleted_at),
        parent_category_id: updated.product.category.parent_category_id,
      } satisfies IShoppingMallCategory.ISummary,
      created_at: toISOStringSafe(updated.product.created_at),
      updated_at: toISOStringSafe(updated.product.updated_at),
      deleted_at:
        updated.product.deleted_at === null
          ? null
          : toISOStringSafe(updated.product.deleted_at),
    } satisfies IShoppingMallProduct.ISummary,
    author: {
      id: updated.customer.id,
    } satisfies IShoppingMallMember.ISummary,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
