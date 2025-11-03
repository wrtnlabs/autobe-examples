import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductCodeSkusSkuCode(props: {
  admin: AdminPayload;
  productCode: string;
  skuCode: string;
}): Promise<void> {
  const { admin, productCode, skuCode } = props;

  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { code: productCode },
  });
  if (!product) {
    throw new HttpException(
      `Product with code '${productCode}' not found`,
      404,
    );
  }

  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      shopping_mall_product_id: product.id,
      sku_code: skuCode,
    },
  });
  if (!sku) {
    throw new HttpException(
      `SKU with code '${skuCode}' not found for product '${productCode}'`,
      404,
    );
  }

  await MyGlobal.prisma.shopping_mall_product_skus.delete({
    where: { id: sku.id },
  });
}
