import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerSkuInventories(props: {
  seller: SellerPayload;
  body: IShoppingMallSkuInventory.ICreate;
}): Promise<IShoppingMallSkuInventory> {
  const { seller, body } = props;

  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      id: body.shopping_mall_product_sku_id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });

  if (!sku) {
    throw new HttpException(
      `Product SKU not found: ${body.shopping_mall_product_sku_id}`,
      404,
    );
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

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
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
