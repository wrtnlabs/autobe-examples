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

export async function postShoppingMallSellerShoppingMallProductsProductCodeShoppingMallProductSkus(props: {
  seller: SellerPayload;
  productCode: string;
  body: IShoppingMallProductSku.ICreate;
}): Promise<IShoppingMallProductSku> {
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      code: props.productCode,
      seller: { id: props.seller.id },
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  const existingSku =
    await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
      where: {
        shopping_mall_product_id: product.id,
        sku_code: props.body.sku_code,
        deleted_at: null,
      },
    });

  if (existingSku) {
    throw new HttpException("SKU code already exists for this product", 400);
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_product_skus.create({
    data: {
      id: v4(),
      shopping_mall_product_id: product.id,
      sku_code: props.body.sku_code,
      price: props.body.price,
      inventory: props.body.inventory,
      is_active: props.body.is_active,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    sku_code: created.sku_code,
    price: created.price,
    inventory: created.inventory,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
