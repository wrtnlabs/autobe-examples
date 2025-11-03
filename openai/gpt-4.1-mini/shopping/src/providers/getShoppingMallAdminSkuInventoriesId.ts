import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminSkuInventoriesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSkuInventory> {
  const found = await MyGlobal.prisma.shopping_mall_sku_inventories.findFirst({
    where: { id: props.id, deleted_at: null },
  });

  if (found === null) {
    throw new HttpException("SKU inventory not found", 404);
  }

  return {
    id: found.id,
    shopping_mall_product_sku_id: found.shopping_mall_product_sku_id,
    quantity: found.quantity,
    stock_status: typia.assert<"in stock" | "out of stock" | "backordered">(
      found.stock_status,
    ),
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at: found.deleted_at ? toISOStringSafe(found.deleted_at) : null,
  };
}
