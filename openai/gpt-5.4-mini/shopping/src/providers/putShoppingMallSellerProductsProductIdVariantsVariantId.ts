import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantTransformer } from "../transformers/ShoppingMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IUpdate;
}): Promise<IShoppingMallProductVariant> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        deleted_at: true,
      },
    });
  if (product.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        sku_code: true,
        override_price: true,
        stock_quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (variant.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  const nextSkuCode = props.body.skuCode ?? variant.sku_code;
  const nextOverridePrice =
    props.body.overridePrice === undefined
      ? variant.override_price
      : props.body.overridePrice;
  if (nextSkuCode !== variant.sku_code) {
    const duplicated =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
        where: {
          sku_code: nextSkuCode,
          NOT: { id: props.variantId },
        },
        select: { id: true },
      });
    if (duplicated !== null) {
      throw new HttpException("Duplicate SKU code", 400);
    }
  }
  const current =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      ...ShoppingMallProductVariantTransformer.select(),
    });
  if (
    nextSkuCode === variant.sku_code &&
    nextOverridePrice === variant.override_price &&
    props.body.optionValues === undefined
  ) {
    return await ShoppingMallProductVariantTransformer.transform(current);
  }
  await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      sku_code: nextSkuCode,
      override_price: nextOverridePrice,
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      ...ShoppingMallProductVariantTransformer.select(),
    });
  return await ShoppingMallProductVariantTransformer.transform(updated);
}
