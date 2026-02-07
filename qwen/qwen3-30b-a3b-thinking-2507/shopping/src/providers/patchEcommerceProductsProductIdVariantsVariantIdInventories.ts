import { IEcommerceInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventory";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceInventoryTransformer } from "../transformers/EcommerceInventoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceProductsProductIdVariantsVariantIdInventories(props: {
  productId: string;
  variantId: string;
  body: IEcommerceInventory.IUpdate;
}): Promise<IEcommerceInventory> {
  const variant = await MyGlobal.prisma.ecommerce_product_variants.findUnique({
    where: { id: props.variantId, deleted_at: null },
    select: { id: true, stock_quantity: true, updated_at: true },
  });
  if (!variant) {
    throw new HttpException("Variant not found", 404);
  }
  const newStock = variant.stock_quantity + props.body.quantity_change;
  if (newStock < 0) {
    throw new HttpException("Inventory cannot go negative", 400);
  }
  const created = await MyGlobal.prisma.ecommerce_inventories.create({
    data: {
      id: v4(),
      quantity_change: props.body.quantity_change,
      reason: props.body.reason,
      ecommerce_product_variant_id: props.variantId,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  await MyGlobal.prisma.ecommerce_product_variants.update({
    where: { id: props.variantId },
    data: {
      stock_quantity: newStock,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const inventory = await MyGlobal.prisma.ecommerce_inventories.findUnique({
    where: { id: created.id },
    ...EcommerceInventoryTransformer.select(),
  });
  if (!inventory) {
    throw new HttpException("Inventory record not found", 404);
  }
  return await EcommerceInventoryTransformer.transform(inventory);
}
