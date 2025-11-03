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

export async function postShoppingMallAdminSkuInventories(props: {
  admin: AdminPayload;
  body: IShoppingMallSkuInventory.ICreate;
}): Promise<IShoppingMallSkuInventory> {
  const { admin, body } = props;

  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: body.shopping_mall_product_sku_id },
    select: { id: true },
  });

  if (!sku) {
    throw new HttpException(
      `SKU not found with id: ${body.shopping_mall_product_sku_id}`,
      400,
    );
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_sku_inventories.create({
    data: {
      id: v4(),
      shopping_mall_product_sku_id: body.shopping_mall_product_sku_id,
      quantity: body.quantity,
      stock_status: body.stock_status,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    shopping_mall_product_sku_id: created.shopping_mall_product_sku_id,
    quantity: created.quantity,
    stock_status: typia.assert<"in stock" | "out of stock" | "backordered">(
      created.stock_status,
    ),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
