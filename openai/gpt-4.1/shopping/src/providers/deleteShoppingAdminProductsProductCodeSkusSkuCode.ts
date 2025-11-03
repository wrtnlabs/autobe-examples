import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminProductsProductCodeSkusSkuCode(props: {
  admin: AdminPayload;
  productCode: string;
  skuCode: string;
}): Promise<void> {
  // Step 1: Find the parent product by business code and not soft-deleted
  const product = await MyGlobal.prisma.shopping_products.findFirst({
    where: {
      code: props.productCode,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // Step 2: Find the SKU by code and product, not already deleted
  const sku = await MyGlobal.prisma.shopping_skus.findFirst({
    where: {
      sku_code: props.skuCode,
      shopping_product_id: product.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!sku) {
    throw new HttpException("SKU not found", 404);
  }

  // Step 3: Soft-delete (archive) the SKU
  await MyGlobal.prisma.shopping_skus.update({
    where: { id: sku.id },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
