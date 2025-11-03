import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingSellerProductsProductCodeSkusSkuCode(props: {
  seller: SellerPayload;
  productCode: string;
  skuCode: string;
}): Promise<void> {
  const { seller, productCode, skuCode } = props;

  // 1. Find the product by code, owned by the seller, not soft-deleted
  const product = await MyGlobal.prisma.shopping_products.findFirst({
    where: {
      code: productCode,
      shopping_seller_id: seller.id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or not owned by seller", 404);
  }

  // 2. Find the SKU by sku_code under that product, not soft-deleted
  const sku = await MyGlobal.prisma.shopping_skus.findFirst({
    where: {
      shopping_product_id: product.id,
      sku_code: skuCode,
      deleted_at: null,
    },
  });
  if (!sku) {
    throw new HttpException("SKU not found or already deleted", 404);
  }

  // 3. Perform soft delete (set deleted_at), update updated_at
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_skus.update({
    where: { id: sku.id },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
