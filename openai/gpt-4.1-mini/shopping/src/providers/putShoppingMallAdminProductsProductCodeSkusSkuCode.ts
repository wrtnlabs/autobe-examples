import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminProductsProductCodeSkusSkuCode(props: {
  admin: AdminPayload;
  productCode: string;
  skuCode: string;
  body: IShoppingMallProductSku.IUpdate;
}): Promise<IShoppingMallProductSku> {
  const { admin, productCode, skuCode, body } = props;

  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      code: productCode,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException(
      `Product with code '${productCode}' not found`,
      404,
    );
  }

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

  const updated = await MyGlobal.prisma.shopping_mall_product_skus.update({
    where: { id: sku.id },
    data: {
      price: body.price,
      attributes_json: body.attributes_json ?? null,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    sku_code: updated.sku_code,
    price: updated.price,
    attributes_json: updated.attributes_json ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
