import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductCodeSkusSkuCode(props: {
  seller: SellerPayload;
  productCode: string;
  skuCode: string;
}): Promise<void> {
  const { seller, productCode, skuCode } = props;

  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { code: productCode },
  });

  if (product === null) {
    throw new HttpException("Product not found", 404);
  }

  try {
    await MyGlobal.prisma.shopping_mall_product_skus.delete({
      where: {
        shopping_mall_product_id: product.id,
        sku_code: skuCode,
      },
    });
  } catch {
    throw new HttpException("SKU not found", 404);
  }
}
