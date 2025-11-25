import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerShoppingMallProductsProductCodeShoppingMallProductVariantsSkuCode(props: {
  seller: SellerPayload;
  productCode: string;
  skuCode: string;
  body: IShoppingMallProductVariant.IUpdate;
}): Promise<IShoppingMallProductVariant> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { code: props.productCode },
  });

  if (!product) {
    throw new HttpException(
      `Product with code ${props.productCode} not found`,
      404,
    );
  }

  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { sku_code: props.skuCode },
    });

  if (!variant) {
    throw new HttpException(
      `Product variant with skuCode ${props.skuCode} not found`,
      404,
    );
  }

  if (variant.shopping_mall_product_id !== product.id) {
    throw new HttpException(
      "Product variant does not belong to the specified product",
      400,
    );
  }

  const updated = await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { sku_code: props.skuCode },
    data: {
      color:
        props.body.color === undefined
          ? undefined
          : props.body.color === null
            ? null
            : props.body.color,
      size:
        props.body.size === undefined
          ? undefined
          : props.body.size === null
            ? null
            : props.body.size,
      option:
        props.body.option === undefined
          ? undefined
          : props.body.option === null
            ? null
            : props.body.option,
      price: props.body.price,
      status: props.body.status,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    shopping_mall_product_id: updated.shopping_mall_product_id,
    sku_code: updated.sku_code,
    color:
      updated.color === null
        ? null
        : updated.color === undefined
          ? undefined
          : updated.color,
    size:
      updated.size === null
        ? null
        : updated.size === undefined
          ? undefined
          : updated.size,
    option:
      updated.option === null
        ? null
        : updated.option === undefined
          ? undefined
          : updated.option,
    price: updated.price,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? null
        : updated.deleted_at === undefined
          ? undefined
          : toISOStringSafe(updated.deleted_at),
  };
}
