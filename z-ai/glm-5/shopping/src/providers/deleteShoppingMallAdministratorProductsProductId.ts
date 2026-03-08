import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallAdministratorProductsProductId(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the product and ensure it exists and is not deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, deleted_at: true },
  });
  if (product === null || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // Administrators can bypass constraint checks per specification
  // No need to check for pending orders, cancellations, or refunds
  // Get current timestamp for soft delete
  const now = new Date();
  // Execute deletion in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Get all variant IDs for inventory record deletion
    const variants = await tx.shopping_mall_product_variants.findMany({
      where: { shopping_mall_product_id: props.productId },
      select: { id: true },
    });
    const variantIds = variants.map((v) => v.id);
    // Delete all inventory records for the variants (hard delete)
    if (variantIds.length > 0) {
      await tx.shopping_mall_inventory_records.deleteMany({
        where: { variant_id: { in: variantIds } },
      });
    }
    // Soft delete all product variants
    await tx.shopping_mall_product_variants.updateMany({
      where: { shopping_mall_product_id: props.productId },
      data: { deleted_at: now },
    });
    // Delete all product images (hard delete)
    await tx.shopping_mall_product_images.deleteMany({
      where: { shopping_mall_product_id: props.productId },
    });
    // Delete all wishlist items referencing this product (hard delete)
    await tx.shopping_mall_wishlist_items.deleteMany({
      where: { shopping_mall_product_id: props.productId },
    });
    // Soft delete the product
    await tx.shopping_mall_products.update({
      where: { id: props.productId },
      data: { deleted_at: now },
    });
  });
}
