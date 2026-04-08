import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.body.shopping_mall_order_item_id },
      select: {
        id: true,
        status: true,
        order: {
          select: {
            member_id: true,
          },
        },
      },
    });
  if (orderItem.order.member_id !== props.member.id) {
    throw new HttpException("Forbidden: You do not own this order item", 403);
  }
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Forbidden: Can only review delivered order items",
      403,
    );
  }
  const record = await MyGlobal.prisma.shopping_mall_reviews.create({
    data: await ShoppingMallReviewCollector.collect({
      body: props.body,
      shoppingMallMembers: { id: props.member.id },
    }),
    ...ShoppingMallReviewTransformer.select(),
  });
  return await ShoppingMallReviewTransformer.transform(record);
}
