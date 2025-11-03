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

export async function putShoppingMallAdminSkuInventoriesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallSkuInventory.IUpdate;
}): Promise<IShoppingMallSkuInventory> {
  const { admin, id, body } = props;

  if (body.quantity < 0) {
    throw new HttpException("Quantity cannot be negative", 400);
  }

  const existing =
    await MyGlobal.prisma.shopping_mall_sku_inventories.findFirst({
      where: {
        id,
        deleted_at: null,
      },
    });

  if (!existing) {
    throw new HttpException("SKU inventory not found", 404);
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_sku_inventories.update({
    where: { id },
    data: {
      quantity: body.quantity,
      stock_status: body.stock_status,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    shopping_mall_product_sku_id: updated.shopping_mall_product_sku_id,
    quantity: updated.quantity,
    stock_status: typia.assert<"in stock" | "out of stock" | "backordered">(
      updated.stock_status,
    ),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
