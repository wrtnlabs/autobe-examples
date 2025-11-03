import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerProductsProductCodeSkusSkuCode(props: {
  seller: SellerPayload;
  productCode: string;
  skuCode: string;
}): Promise<IShoppingMallProductSku> {
  const { seller, productCode, skuCode } = props;

  // Find product by productCode
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      code: productCode,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });

  if (!product) {
    throw new HttpException(
      `Product with code '${productCode}' not found`,
      404,
    );
  }

  // Find SKU by skuCode and product ID, exclude soft-deleted
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      sku_code: skuCode,
      shopping_mall_product_id: product.id,
      deleted_at: null,
    },
  });

  if (!sku) {
    throw new HttpException(
      `SKU with code '${skuCode}' not found for product '${productCode}'`,
      404,
    );
  }

  return {
    id: sku.id,
    shopping_mall_product_id: sku.shopping_mall_product_id,
    sku_code: sku.sku_code,
    price: sku.price,
    attributes_json: sku.attributes_json ?? undefined,
    created_at: toISOStringSafe(sku.created_at),
    updated_at: toISOStringSafe(sku.updated_at),
    deleted_at: sku.deleted_at ? toISOStringSafe(sku.deleted_at) : null,
  };
}
