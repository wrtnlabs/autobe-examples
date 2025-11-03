import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingInventory";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminInventorySkuCode(props: {
  admin: AdminPayload;
  skuCode: string;
}): Promise<IShoppingInventory> {
  // 1. Find the SKU by unique code
  const sku = await MyGlobal.prisma.shopping_skus.findUnique({
    where: { sku_code: props.skuCode },
  });
  if (!sku) throw new HttpException("SKU not found", 404);

  // 2. Load its inventory record
  const inventory = await MyGlobal.prisma.shopping_inventory.findUnique({
    where: { shopping_sku_id: sku.id },
  });
  if (!inventory) throw new HttpException("Inventory not found for SKU", 404);

  // 3. Get product summary for the SKU
  const product = await MyGlobal.prisma.shopping_products.findUnique({
    where: { id: sku.shopping_product_id },
  });
  if (!product) throw new HttpException("Product not found for SKU", 404);

  return {
    id: inventory.id,
    shopping_sku_id: inventory.shopping_sku_id,
    quantity: inventory.quantity,
    created_at: toISOStringSafe(inventory.created_at),
    updated_at: toISOStringSafe(inventory.updated_at),
    deleted_at:
      inventory.deleted_at !== undefined && inventory.deleted_at !== null
        ? toISOStringSafe(inventory.deleted_at)
        : undefined,
    sku: {
      id: sku.id,
      sku_code: sku.sku_code,
      price: sku.price,
      is_active: sku.is_active,
      status: sku.status,
    },
    product: {
      id: product.id,
      code: product.code,
      name: product.name,
      main_image_uri:
        product.main_image_uri !== undefined && product.main_image_uri !== null
          ? product.main_image_uri
          : undefined,
      status: product.status,
    },
  };
}
