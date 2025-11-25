import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShoppingMallProductsProductCodeShoppingMallProductVariantsSkuCode(props: {
  admin: AdminPayload;
  productCode: string;
  skuCode: string;
}): Promise<void> {
  // Verify product existence by productCode
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { code: props.productCode },
  });

  if (!product) {
    throw new HttpException(`Product not found: ${props.productCode}`, 404);
  }

  // Verify product variant existence by skuCode and productId
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        sku_code: props.skuCode,
        shopping_mall_product_id: product.id,
      },
    });

  if (!variant) {
    throw new HttpException(
      `Product variant SKU not found: ${props.skuCode}`,
      404,
    );
  }

  // Perform hard delete of the product variant SKU
  await MyGlobal.prisma.shopping_mall_product_variants.delete({
    where: { id: variant.id },
  });
}
