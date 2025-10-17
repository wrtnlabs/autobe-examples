import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
  const { seller, productId, skuId } = props;

  // Step 1: Verify seller owns the product
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: productId,
      shopping_mall_seller_id: seller.id,
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException(
      "Product not found or you do not have permission to manage it",
      404,
    );
  }

  // Step 2: Verify SKU exists and belongs to this product
  const sku = await MyGlobal.prisma.shopping_mall_skus.findFirst({
    where: {
      id: skuId,
      shopping_mall_product_id: productId,
    },
  });

  if (!sku) {
    throw new HttpException(
      "SKU not found or does not belong to this product",
      404,
    );
  }

  // Step 3: Check if SKU is referenced in any orders
  const orderItemCount = await MyGlobal.prisma.shopping_mall_order_items.count({
    where: {
      shopping_mall_sku_id: skuId,
    },
  });

  if (orderItemCount > 0) {
    throw new HttpException(
      "Cannot delete SKU because it is referenced in existing orders. SKU must be preserved for order history integrity.",
      400,
    );
  }

  // Step 4: Count remaining active SKUs for this product
  const remainingSkuCount = await MyGlobal.prisma.shopping_mall_skus.count({
    where: {
      shopping_mall_product_id: productId,
      id: { not: skuId },
    },
  });

  if (remainingSkuCount === 0) {
    throw new HttpException(
      "Cannot delete the last SKU. Products must have at least one variant.",
      400,
    );
  }

  // Step 5: Perform hard delete (no deleted_at field in schema)
  await MyGlobal.prisma.shopping_mall_skus.delete({
    where: {
      id: skuId,
    },
  });
}
