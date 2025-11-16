import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerShoppingMallProductsProductCodeShoppingMallProductSkusSkuCode(props: {
  customer: CustomerPayload;
  productCode: string;
  skuCode: string;
}): Promise<IShoppingMallProductSku> {
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      code: props.productCode,
    },
  });

  if (!product) {
    throw new HttpException(
      `Product not found for productCode ${props.productCode}`,
      404,
    );
  }

  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      sku_code: props.skuCode,
      shopping_mall_product_id: product.id,
    },
  });

  if (!sku) {
    throw new HttpException(
      `Product SKU not found for productCode ${props.productCode} and skuCode ${props.skuCode}`,
      404,
    );
  }

  return {
    id: sku.id,
    shopping_mall_product_id: sku.shopping_mall_product_id,
    sku_code: sku.sku_code,
    price: sku.price,
    inventory: sku.inventory,
    is_active: sku.is_active,
    created_at: toISOStringSafe(sku.created_at),
    updated_at: toISOStringSafe(sku.updated_at),
    deleted_at:
      sku.deleted_at === null ? undefined : toISOStringSafe(sku.deleted_at),
  };
}
