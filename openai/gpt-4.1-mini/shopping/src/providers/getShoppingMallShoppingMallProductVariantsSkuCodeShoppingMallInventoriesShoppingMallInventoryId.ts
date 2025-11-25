import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventory";

export async function getShoppingMallShoppingMallProductVariantsSkuCodeShoppingMallInventoriesShoppingMallInventoryId(props: {
  skuCode: string;
  shoppingMallInventoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallInventory> {
  const productVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        sku_code: props.skuCode,
        deleted_at: null,
      },
    });

  if (!productVariant) {
    throw new HttpException(
      `Product variant with skuCode '${props.skuCode}' not found`,
      404,
    );
  }

  const inventory = await MyGlobal.prisma.shopping_mall_inventories.findFirst({
    where: {
      id: props.shoppingMallInventoryId,
      shopping_mall_product_variant_id: productVariant.id,
      deleted_at: null,
    },
  });

  if (!inventory) {
    throw new HttpException(
      `Inventory with id '${props.shoppingMallInventoryId}' not found for skuCode '${props.skuCode}'`,
      404,
    );
  }

  return {
    id: inventory.id,
    shopping_mall_product_variant_id:
      inventory.shopping_mall_product_variant_id,
    quantity: inventory.quantity,
    reserved_quantity: inventory.reserved_quantity,
    restock_date: inventory.restock_date
      ? toISOStringSafe(inventory.restock_date)
      : null,
    created_at: toISOStringSafe(inventory.created_at),
    updated_at: toISOStringSafe(inventory.updated_at),
    deleted_at: inventory.deleted_at
      ? toISOStringSafe(inventory.deleted_at)
      : null,
  };
}
