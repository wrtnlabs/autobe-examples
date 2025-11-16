import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerShoppingMallProductsProductCodeShoppingMallProductSkusSkuCode(props: {
  seller: SellerPayload;
  productCode: string;
  skuCode: string;
}): Promise<void> {
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      code: props.productCode,
      seller: { id: props.seller.id },
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException("Product not found or access forbidden", 404);
  }

  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      sku_code: props.skuCode,
      product: { id: product.id },
      deleted_at: null,
    },
  });

  if (!sku) {
    throw new HttpException("SKU not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_product_skus.delete({
    where: {
      id: sku.id,
    },
  });
}
