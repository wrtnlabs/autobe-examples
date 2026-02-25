import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallOrderItemSnapshotCollector } from "../collectors/ShoppingMallOrderItemSnapshotCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallOrderItemSnapshotTransformer } from "../transformers/ShoppingMallOrderItemSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorOrderItemSnapshots(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallOrderItemSnapshot.ICreate;
}): Promise<IShoppingMallOrderItemSnapshot> {
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.body.shoppingMallOrderId },
  });
  await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
    where: { id: props.body.shoppingMallOrderItemId },
  });
  const data = await ShoppingMallOrderItemSnapshotCollector.collect({
    body: props.body,
  });
  const created =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.create({
      data,
      ...ShoppingMallOrderItemSnapshotTransformer.select(),
    });
  return await ShoppingMallOrderItemSnapshotTransformer.transform(created);
}
