import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerShoppingMallProductsProductCodeShoppingMallProductVariants(props: {
  seller: SellerPayload;
  productCode: string;
  body: IShoppingMallProductVariant.ICreate;
}): Promise<IShoppingMallProductVariant> {
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      code: props.productCode,
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  const existingVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        sku_code: props.body.sku_code,
        deleted_at: null,
      },
    });

  if (existingVariant) {
    throw new HttpException("SKU code already exists", 400);
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_product_variants.create({
    data: {
      id: v4(),
      shopping_mall_product_id: product.id,
      sku_code: props.body.sku_code,
      color: props.body.color ?? null,
      size: props.body.size ?? null,
      option: props.body.option ?? null,
      price: props.body.price,
      status: props.body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    shopping_mall_product_id: created.shopping_mall_product_id,
    sku_code: created.sku_code,
    color: created.color ?? undefined,
    size: created.size ?? undefined,
    option: created.option ?? undefined,
    price: created.price,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
