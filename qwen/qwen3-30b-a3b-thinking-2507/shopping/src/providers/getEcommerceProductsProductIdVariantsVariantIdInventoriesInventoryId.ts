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

export async function getEcommerceProductsProductIdVariantsVariantIdInventoriesInventoryId(props: {
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  inventoryId: string & tags.Format<"uuid">;
}): Promise<IEcommerceInventory> {
  // Verify variant exists and belongs to product
  const variant = await MyGlobal.prisma.ecommerce_product_variants.findUnique({
    where: {
      id: props.variantId,
    },
    select: { id: true, products_id: true }, // Fixed field name from 'ecommerce_product_id' to 'products_id'
  });
  if (!variant || variant.products_id !== props.productId) {
    // Fixed field name
    throw new HttpException("Product variant not found", 404);
  }
  // Verify inventory record exists for the variant
  const inventory = await MyGlobal.prisma.ecommerce_inventories.findUnique({
    where: {
      id: props.inventoryId,
      ecommerce_product_variant_id: props.variantId,
    },
    ...EcommerceInventoryTransformer.select(),
  });
  if (!inventory) {
    throw new HttpException("Inventory record not found", 404);
  }
  return await EcommerceInventoryTransformer.transform(inventory);
}
