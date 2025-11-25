import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerShoppingMallProductsProductCodeShoppingMallProductVariantsSkuCode(props: {
  seller: SellerPayload;
  productCode: string;
  skuCode: string;
}): Promise<void> {
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      code: props.productCode,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });

  if (!product) {
    throw new HttpException(
      `Product with code ${props.productCode} not found.`,
      404,
    );
  }

  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        sku_code: props.skuCode,
        shopping_mall_product_id: product.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });

  if (!variant) {
    throw new HttpException(
      `Product variant with SKU code ${props.skuCode} not found under product ${props.productCode}.`,
      404,
    );
  }

  await MyGlobal.prisma.shopping_mall_product_variants.delete({
    where: {
      id: variant.id,
    },
  });
}
