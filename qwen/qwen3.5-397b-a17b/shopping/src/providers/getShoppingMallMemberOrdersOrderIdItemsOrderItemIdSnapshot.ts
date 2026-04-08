import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallOrderItemSnapshotTransformer } from "../transformers/ShoppingMallOrderItemSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberOrdersOrderIdItemsOrderItemIdSnapshot(props: {
  member: MemberPayload;
  orderId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItemSnapshot> {
  // Verify orderItemId belongs to orderId and member owns the order
  await MyGlobal.prisma.shopping_mall_order_items.findFirstOrThrow({
    where: {
      id: props.orderItemId,
      shopping_mall_order_id: props.orderId,
      order: {
        member_id: props.member.id,
      },
    },
    select: {
      id: true,
    },
  });
  // Retrieve snapshot using transformer select
  const snapshot =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findFirstOrThrow({
      where: {
        shopping_mall_order_item_id: props.orderItemId,
      },
      ...ShoppingMallOrderItemSnapshotTransformer.select(),
    });
  return await ShoppingMallOrderItemSnapshotTransformer.transform(snapshot);
}
