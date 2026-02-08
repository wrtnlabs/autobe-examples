import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallOrderItemSnapshotsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItemSnapshot> {
  const record =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findUnique({
      where: { id: props.id },
    });
  if (!record) {
    throw new HttpException("Order item snapshot not found", 404);
  }
  return record;
}
