import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventory";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerShoppingMallProductVariantsSkuCodeShoppingMallInventoriesShoppingMallInventoryId(props: {
  customer: CustomerPayload;
  skuCode: string;
  shoppingMallInventoryId: string & tags.Format<"uuid">;
  body: IShoppingMallInventory.IUpdate;
}): Promise<IShoppingMallInventory> {
  const productVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { sku_code: props.skuCode },
    });
  if (!productVariant) {
    throw new HttpException(
      `Product variant not found with skuCode: ${props.skuCode}`,
      404,
    );
  }

  const inventory = await MyGlobal.prisma.shopping_mall_inventories.findUnique({
    where: { id: props.shoppingMallInventoryId },
  });
  if (!inventory) {
    throw new HttpException(
      `Inventory record not found with id: ${props.shoppingMallInventoryId}`,
      404,
    );
  }

  if (inventory.shopping_mall_product_variant_id !== productVariant.id) {
    throw new HttpException(
      `Inventory does not belong to product variant skuCode: ${props.skuCode}`,
      400,
    );
  }

  const updated = await MyGlobal.prisma.shopping_mall_inventories.update({
    where: { id: props.shoppingMallInventoryId },
    data: {
      quantity: props.body.quantity,
      reserved_quantity: props.body.reserved_quantity,
      restock_date:
        props.body.restock_date === undefined
          ? undefined
          : props.body.restock_date === null
            ? null
            : props.body.restock_date,
      created_at:
        props.body.created_at === undefined
          ? undefined
          : props.body.created_at === null
            ? undefined
            : props.body.created_at,
      updated_at:
        props.body.updated_at === undefined
          ? undefined
          : props.body.updated_at === null
            ? undefined
            : props.body.updated_at,
      deleted_at:
        props.body.deleted_at === undefined
          ? undefined
          : props.body.deleted_at === null
            ? undefined
            : props.body.deleted_at,
    },
  });

  return {
    id: updated.id,
    shopping_mall_product_variant_id: updated.shopping_mall_product_variant_id,
    quantity: updated.quantity,
    reserved_quantity: updated.reserved_quantity,
    restock_date:
      updated.restock_date === null
        ? null
        : updated.restock_date === undefined
          ? undefined
          : toISOStringSafe(updated.restock_date),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? null
        : updated.deleted_at === undefined
          ? undefined
          : toISOStringSafe(updated.deleted_at),
  };
}
