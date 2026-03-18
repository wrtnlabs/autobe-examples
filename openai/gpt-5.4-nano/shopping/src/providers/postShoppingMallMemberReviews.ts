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
import { ShoppingMallReviewCollector } from "../collectors/ShoppingMallReviewCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallReviewTransformer } from "../transformers/ShoppingMallReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberReviews(props: {
  member: MemberPayload;
  body: IShoppingMallReview.ICreate;
}): Promise<IShoppingMallReview> {
  const member = props.member;
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.body.shopping_mall_order_item_id },
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_product_variant_id: true,
        line_item_status: true,
        order: {
          select: {
            shopping_customer_id: true,
          },
        },
        productVariant: {
          select: {
            shopping_mall_product_id: true,
          },
        },
      },
    });
  if (orderItem.order.shopping_customer_id !== member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (orderItem.line_item_status !== "delivered") {
    throw new HttpException("Review can be created only after delivery", 400);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const created = await tx.shopping_mall_reviews.create({
      data: await ShoppingMallReviewCollector.collect({
        body: props.body,
        product: {
          id: orderItem.productVariant.shopping_mall_product_id,
        } as any,
        customer: { id: member.id } as any,
      }),
      select: { id: true },
    });
    const snapshot = await tx.shopping_mall_snapshots.create({
      data: {
        id: v4() as any,
        snapshot_code: v4(),
        source_type: "review",
        source_entity_id: created.id,
        source_order_item_id: orderItem.id,
        created_by_member_id: member.id,
        reason: "created",
        created_at: new Date() as any,
        updated_at: new Date() as any,
        deleted_at: null,
      },
    });
    await tx.shopping_mall_review_snapshots_indices.create({
      data: {
        id: v4(),
        shopping_mall_snapshot_id: snapshot.id,
        review_id: created.id,
        action_type: "created",
        snapshot_sequence: 1,
        created_at: new Date() as any,
        updated_at: new Date() as any,
        deleted_at: null,
      },
    });
    await tx.shopping_mall_snapshot_parties.createMany({
      data: [
        {
          id: v4(),
          shopping_mall_snapshot_id: snapshot.id,
          party_type: "owner",
          party_id: member.id,
          can_view: true,
          created_at: new Date() as any,
          updated_at: new Date() as any,
          deleted_at: null,
        },
        {
          id: v4(),
          shopping_mall_snapshot_id: snapshot.id,
          party_type: "admin",
          party_id: member.id,
          can_view: true,
          created_at: new Date() as any,
          updated_at: new Date() as any,
          deleted_at: null,
        },
      ],
    });
  });
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: {
      shopping_mall_order_item_id: props.body.shopping_mall_order_item_id,
    },
    ...ShoppingMallReviewTransformer.select(),
  });
  return await ShoppingMallReviewTransformer.transform(review);
}
