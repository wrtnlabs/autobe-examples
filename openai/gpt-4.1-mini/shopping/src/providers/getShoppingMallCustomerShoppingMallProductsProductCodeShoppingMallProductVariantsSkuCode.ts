import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerShoppingMallProductsProductCodeShoppingMallProductVariantsSkuCode(props: {
  customer: CustomerPayload;
  productCode: string;
  skuCode: string;
}): Promise<IShoppingMallProductVariant> {
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: { code: props.productCode },
    select: { id: true },
  });

  if (!product) {
    throw new HttpException("Shopping mall product not found", 404);
  }

  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        sku_code: props.skuCode,
        shopping_mall_product_id: product.id,
        deleted_at: null,
      },
    });

  if (!variant) {
    throw new HttpException("Product variant not found", 404);
  }

  return {
    shopping_mall_product_id: variant.shopping_mall_product_id,
    sku_code: variant.sku_code,
    color: variant.color ?? undefined,
    size: variant.size ?? undefined,
    option: variant.option ?? undefined,
    price: variant.price,
    status: variant.status,
    created_at: toISOStringSafe(variant.created_at),
    updated_at: toISOStringSafe(variant.updated_at),
    deleted_at: variant.deleted_at ? toISOStringSafe(variant.deleted_at) : null,
  };
}
