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
import { ShoppingMallProductVariantOptionCollector } from "../collectors/ShoppingMallProductVariantOptionCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantOptionTransformer } from "../transformers/ShoppingMallProductVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProductsProductIdVariantsVariantIdOptions(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariantOption.ICreate;
}): Promise<IShoppingMallProductVariantOption> {
  const optionName: string = props.body.option_name.trim();
  const optionValue: string = props.body.option_value.trim();
  if (optionName.length === 0 || optionValue.length === 0) {
    throw new HttpException("Option name and value must not be blank", 400);
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const product = await tx.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
    if (product.shopping_mall_seller_id !== props.seller.id) {
      throw new HttpException("Forbidden", 403);
    }
    const variant = await tx.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        shopping_mall_product_id: true,
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
      throw new HttpException("Variant is not available", 400);
    }
    const existed = await tx.shopping_mall_product_variant_options.findFirst({
      where: {
        shopping_mall_product_variant_id: props.variantId,
        option_name: optionName,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (existed !== null) {
      throw new HttpException(
        "Option name already exists for this variant",
        400,
      );
    }
    const created = await tx.shopping_mall_product_variant_options.create({
      data: await ShoppingMallProductVariantOptionCollector.collect({
        body: {
          option_name: optionName,
          option_value: optionValue,
        },
        productVariant: {
          id: props.variantId,
        },
      }),
      select: {
        id: true,
      },
    });
    const option =
      await tx.shopping_mall_product_variant_options.findUniqueOrThrow({
        where: { id: created.id },
        ...ShoppingMallProductVariantOptionTransformer.select(),
      });
    return await ShoppingMallProductVariantOptionTransformer.transform(option);
  });
}
