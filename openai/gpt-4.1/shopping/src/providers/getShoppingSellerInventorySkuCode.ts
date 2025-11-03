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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingSellerInventorySkuCode(props: {
  seller: SellerPayload;
  skuCode: string;
}): Promise<IShoppingInventory> {
  // Lookup the SKU by code and ensure it's owned by the authenticated seller
  const sku = await MyGlobal.prisma.shopping_skus.findFirst({
    where: {
      sku_code: props.skuCode,
      deleted_at: null,
      product: { seller: { id: props.seller.id, deleted_at: null } },
    },
    include: {
      product: true,
    },
  });
  if (!sku) {
    throw new HttpException("SKU not found or not owned by this seller", 404);
  }

  // Lookup inventory by SKU id, must exist, not soft deleted
  const inventory = await MyGlobal.prisma.shopping_inventory.findFirst({
    where: {
      shopping_sku_id: sku.id,
      deleted_at: null,
    },
  });
  if (!inventory) {
    throw new HttpException("Inventory not found for SKU", 404);
  }

  return {
    id: inventory.id,
    shopping_sku_id: inventory.shopping_sku_id,
    quantity: inventory.quantity,
    created_at: toISOStringSafe(inventory.created_at),
    updated_at: toISOStringSafe(inventory.updated_at),
    deleted_at: inventory.deleted_at
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
      id: sku.product.id,
      code: sku.product.code,
      name: sku.product.name,
      main_image_uri: sku.product.main_image_uri ?? undefined,
      status: sku.product.status,
    },
  };
}
