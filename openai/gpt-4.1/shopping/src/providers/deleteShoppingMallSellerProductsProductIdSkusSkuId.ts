import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdSkusSkuId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch the parent product and validate ownership, not soft deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product || product.deleted_at !== null) {
    throw new HttpException("Product not found or is deleted.", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product.", 403);
  }

  // 2. Fetch the SKU and validate
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: props.skuId },
  });
  if (
    !sku ||
    sku.deleted_at !== null ||
    sku.shopping_mall_product_id !== props.productId
  ) {
    throw new HttpException(
      "SKU not found, already deleted, or mismatched with product.",
      404,
    );
  }
  if (sku.status === "locked") {
    throw new HttpException("SKU is locked and cannot be deleted.", 409);
  }

  // 3. Soft delete: Set deleted_at to current datetime in ISO8601 string form
  await MyGlobal.prisma.shopping_mall_product_skus.update({
    where: { id: props.skuId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });

  // 4. Success, return void
  return;
}
