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

export async function postShoppingMallAdminProductsProductCodeSkus(props: {
  admin: AdminPayload;
  productCode: string;
  body: IShoppingMallProductSku.ICreate;
}): Promise<IShoppingMallProductSku> {
  const { admin, productCode, body } = props;

  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      code: productCode,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!product) {
    throw new HttpException(`Product not found: ${productCode}`, 404);
  }

  const existingSku =
    await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
      where: {
        sku_code: body.sku_code,
        deleted_at: null,
      },
      select: { id: true },
    });

  if (existingSku) {
    throw new HttpException(`SKU code already exists: ${body.sku_code}`, 409);
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_product_skus.create({
    data: {
      id: v4(),
      shopping_mall_product_id: product.id,
      sku_code: body.sku_code,
      price: body.price,
      attributes_json: body.attributes_json ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    sku_code: created.sku_code,
    price: created.price,
    attributes_json: created.attributes_json ?? null,
    created_at: toISOStringSafe(
      created.created_at instanceof Date ? created.created_at : new Date(),
    ),
    updated_at: toISOStringSafe(
      created.updated_at instanceof Date ? created.updated_at : new Date(),
    ),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(
            created.deleted_at instanceof Date
              ? created.deleted_at
              : new Date(),
          )
        : null,
  };
}
