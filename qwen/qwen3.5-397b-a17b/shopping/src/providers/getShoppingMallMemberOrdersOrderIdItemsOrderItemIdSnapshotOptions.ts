import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallOrderItemSnapshotOptionAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemSnapshotOptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberOrdersOrderIdItemsOrderItemIdSnapshotOptions(props: {
  member: MemberPayload;
  orderId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItemSnapshotOption.ISummary> {
  await MyGlobal.prisma.shopping_mall_orders.findFirstOrThrow({
    where: {
      id: props.orderId,
      member_id: props.member.id,
    },
  });
  await MyGlobal.prisma.shopping_mall_order_items.findFirstOrThrow({
    where: {
      id: props.orderItemId,
      shopping_mall_order_id: props.orderId,
    },
  });
  const snapshot =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findUniqueOrThrow({
      where: {
        shopping_mall_order_item_id: props.orderItemId,
      },
    });
  const option =
    await MyGlobal.prisma.shopping_mall_order_item_snapshot_options.findFirstOrThrow(
      {
        where: {
          shopping_mall_order_item_snapshot_id: snapshot.id,
        },
        ...ShoppingMallOrderItemSnapshotOptionAtSummaryTransformer.select(),
      },
    );
  return await ShoppingMallOrderItemSnapshotOptionAtSummaryTransformer.transform(
    option,
  );
}
