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

export async function putShoppingMallSellerProductsProductCodeSkusSkuCode(props: {
  seller: SellerPayload;
  productCode: string;
  skuCode: string;
  body: IShoppingMallProductSku.IUpdate;
}): Promise<IShoppingMallProductSku> {
  const { seller, productCode, skuCode, body } = props;

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
  if (!product) throw new HttpException("Product not found", 404);

  // Verify seller has authorization (ownership) is assumed already as seller

  // Find SKU by skuCode and product id
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      shopping_mall_product_id: product.id,
      sku_code: skuCode,
      deleted_at: null,
    },
  });
  if (!sku) throw new HttpException("SKU not found", 404);

  // Update SKU
  const updated = await MyGlobal.prisma.shopping_mall_product_skus.update({
    where: { id: sku.id },
    data: {
      price: body.price,
      attributes_json:
        body.attributes_json === undefined ? undefined : body.attributes_json,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    sku_code: updated.sku_code,
    price: updated.price,
    attributes_json:
      updated.attributes_json === null
        ? null
        : (updated.attributes_json ?? undefined),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
