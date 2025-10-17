import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminInventorySkuId(props: {
  admin: AdminPayload;
  skuId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallInventory> {
  const inventory =
    await MyGlobal.prisma.shopping_mall_inventory.findFirstOrThrow({
      where: { shopping_mall_sku_id: props.skuId },
    });

  return {
    id: inventory.id,
    shopping_mall_sku_id: inventory.shopping_mall_sku_id,
    quantity: inventory.quantity,
    created_at: toISOStringSafe(inventory.created_at),
    updated_at: toISOStringSafe(inventory.updated_at),
  };
}
