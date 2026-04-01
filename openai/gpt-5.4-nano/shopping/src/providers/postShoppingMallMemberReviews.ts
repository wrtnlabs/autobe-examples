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

export async function postShoppingMallMemberReviews(props: {
  member: MemberPayload;
  body: IShoppingMallReview.ICreate;
}): Promise<IShoppingMallReview> {
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.body.shopping_mall_order_item_id },
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_product_variant_id: true,
        line_item_status: true,
      },
    });
  const shoppingOrder =
    await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
      where: { id: orderItem.shopping_mall_order_id },
      select: { shopping_customer_id: true },
    });
  if (shoppingOrder.shopping_customer_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (orderItem.line_item_status !== "delivered") {
    throw new HttpException("Order item not delivered", 400);
  }
  try {
    const created = await MyGlobal.prisma.shopping_mall_reviews.create({
      data: {
        id: v4(),
        rating: props.body.rating,
        body: props.body.body ?? null,
        is_public: props.body.is_public,
        deleted_at: null,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        orderItem: {
          connect: { id: props.body.shopping_mall_order_item_id },
        },
        product: {
          connect: { id: orderItem.shopping_mall_product_variant_id },
        },
        customer: { connect: { id: props.member.id } },
      },
      ...ShoppingMallReviewTransformer.select(),
    });
    return await ShoppingMallReviewTransformer.transform(created);
  } catch (e: any) {
    if (e?.code === "P2002") {
      throw new HttpException("Review already exists", 409);
    }
    throw e;
  }
}
