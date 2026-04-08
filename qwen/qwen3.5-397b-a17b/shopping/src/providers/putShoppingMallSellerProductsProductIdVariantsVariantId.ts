import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, shopping_mall_seller_id: true },
  });
  if (!product || product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Not found", 404);
  }
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: { id: true, shopping_mall_product_id: true, deleted_at: true },
    });
  if (
    !variant ||
    variant.shopping_mall_product_id !== props.productId ||
    variant.deleted_at !== null
  ) {
    throw new HttpException("Not found", 404);
  }
  if (props.body.sku_code !== undefined) {
    const existingVariant =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
        where: {
          shopping_mall_product_id: props.productId,
          sku_code: props.body.sku_code,
          id: { not: props.variantId },
          deleted_at: null,
        },
      });
    if (existingVariant) {
      throw new HttpException("SKU code already exists", 409);
    }
  }
  await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      ...(props.body.sku_code !== undefined && {
        sku_code: props.body.sku_code,
      }),
      ...(props.body.option_values !== undefined && {
        option_values: props.body.option_values,
      }),
      ...(props.body.price !== undefined && { price: props.body.price }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      ...ShoppingMallProductVariantTransformer.select(),
    });
  return await ShoppingMallProductVariantTransformer.transform(updated);
}
