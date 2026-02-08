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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallOrderItemSnapshots(props: {
  body: IShoppingMallOrderItemSnapshot.ICreate;
}): Promise<IShoppingMallOrderItemSnapshot> {
  if (
    !("shopping_mall_order_item_id" in props.body) ||
    typeof props.body.shopping_mall_order_item_id !== "string"
  ) {
    throw new HttpException(
      "Missing or invalid shopping_mall_order_item_id",
      400,
    );
  }
  if (
    !("shopping_mall_order_id" in props.body) ||
    typeof props.body.shopping_mall_order_id !== "string"
  ) {
    throw new HttpException("Missing or invalid shopping_mall_order_id", 400);
  }
  const data = await ShoppingMallOrderItemSnapshotCollector.collect({
    body: props.body,
    orderItem: { id: props.body.shopping_mall_order_item_id },
    order: { id: props.body.shopping_mall_order_id },
  });
  let created;
  try {
    created = await MyGlobal.prisma.shopping_mall_order_item_snapshots.create({
      data,
    });
  } catch (e) {
    throw new HttpException("Failed to create order item snapshot", 500);
  }
  return {
    ...created,
    seller_logo_uri: created.seller_logo_uri ?? null,
    deleted_at: created.deleted_at ?? null,
    created_at:
      created.created_at instanceof Date
        ? created.created_at.toISOString()
        : created.created_at,
    updated_at:
      created.updated_at instanceof Date
        ? created.updated_at.toISOString()
        : created.updated_at,
  };
}
