import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallAdminAdminProductsProductId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify product exists and is not already deleted
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, deleted_at: true },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.deleted_at !== null) {
    throw new HttpException("Product is already deleted", 400);
  }
  // Execute cascade deletion in a single transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 1. Delete all wishlist items referencing this product
    await tx.ecommerce_mall_wishlist_items.deleteMany({
      where: { ecommerce_mall_product_id: props.productId },
    });
    // 2. Get all variant IDs for this product
    const variants = await tx.ecommerce_mall_product_variants.findMany({
      where: { ecommerce_mall_product_id: props.productId },
      select: { id: true },
    });
    const variantIds = variants.map((v) => v.id);
    // 3. Delete inventory records for each variant
    if (variantIds.length > 0) {
      await tx.ecommerce_mall_inventory_records.deleteMany({
        where: { ecommerce_mall_product_variant_id: { in: variantIds } },
      });
      // 4. Delete cart items for each variant
      await tx.ecommerce_mall_cart_items.deleteMany({
        where: { ecommerce_mall_product_variant_id: { in: variantIds } },
      });
    }
    // 5. Soft delete all product variants
    await tx.ecommerce_mall_product_variants.updateMany({
      where: { ecommerce_mall_product_id: props.productId },
      data: { deleted_at: toISOStringSafe(new Date()) },
    });
    // 6. Soft delete the product
    await tx.ecommerce_mall_products.update({
      where: { id: props.productId },
      data: { deleted_at: toISOStringSafe(new Date()) },
    });
  });
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteEcommerceMallAdminAdminProductsProductId(props: {
//   admin: AdminPayload;
//   productId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------