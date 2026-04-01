import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        sku_code: true,
        price_override: true,
        deleted_at: true,
      },
    });
  if (variant.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Variant does not belong to the specified product",
      400,
    );
  }
  if (variant.deleted_at !== null) {
    throw new HttpException("Variant is deleted", 400);
  }
  if (props.body.sku_code) {
    const existingVariant =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
        where: {
          sku_code: props.body.sku_code,
          id: { not: props.variantId },
        },
      });
    if (existingVariant) {
      throw new HttpException("SKU code already exists", 409);
    }
  }
  if (props.body.option_value_ids && props.body.option_value_ids.length === 0) {
    throw new HttpException("Option value IDs array cannot be empty", 400);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_product_variant_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_product_variant_id: props.variantId,
        sku_code: variant.sku_code,
        price_override: variant.price_override,
        created_at: new Date(),
      },
    });
    await tx.shopping_mall_product_variants.update({
      where: { id: props.variantId },
      data: {
        ...(props.body.sku_code !== undefined && {
          sku_code: props.body.sku_code,
        }),
        ...(props.body.price_override !== undefined && {
          price_override: props.body.price_override,
        }),
        updated_at: new Date(),
      },
    });
    await tx.shopping_mall_product_variant_options.deleteMany({
      where: {
        shopping_mall_product_variant_id: props.variantId,
      },
    });
    if (props.body.option_value_ids && props.body.option_value_ids.length > 0) {
      await tx.shopping_mall_product_variant_options.createMany({
        data: props.body.option_value_ids.map((optionValueId) => ({
          id: v4(),
          shopping_mall_product_variant_id: props.variantId,
          shopping_mall_product_option_value_id: optionValueId,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        })),
      });
    }
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      ...ShoppingMallProductVariantTransformer.select(),
    });
  return await ShoppingMallProductVariantTransformer.transform(updated);
}
