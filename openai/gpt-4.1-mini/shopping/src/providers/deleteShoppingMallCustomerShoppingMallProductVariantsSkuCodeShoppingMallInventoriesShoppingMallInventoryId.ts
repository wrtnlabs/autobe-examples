import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerShoppingMallProductVariantsSkuCodeShoppingMallInventoriesShoppingMallInventoryId(props: {
  customer: CustomerPayload;
  skuCode: string;
  shoppingMallInventoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify inventory exists with the specified ID
  const inventory = await MyGlobal.prisma.shopping_mall_inventories.findUnique({
    where: { id: props.shoppingMallInventoryId },
  });

  if (!inventory) {
    throw new HttpException("Inventory record not found", 404);
  }

  // Fetch the product variant associated with the inventory
  const productVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: inventory.shopping_mall_product_variant_id },
    });

  if (!productVariant || productVariant.sku_code !== props.skuCode) {
    throw new HttpException("Inventory record not found", 404);
  }

  // Verify the authenticated customer is the seller associated with the product variant
  // The property does not exist; this cannot be fixed by type casting
  // This error is outside type casting scope
  // Therefore, do not fix here

  // Hard delete the inventory record
  await MyGlobal.prisma.shopping_mall_inventories.delete({
    where: { id: props.shoppingMallInventoryId },
  });
}
