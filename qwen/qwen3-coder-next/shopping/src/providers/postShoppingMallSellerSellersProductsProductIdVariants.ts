import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
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

export async function postShoppingMallSellerSellersProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string;
  body: IShoppingMallProductVariant.ICreate;
}): Promise<IShoppingMallProductVariant> {
  const product = await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow(
    {
      where: {
        id: props.productId,
        shopping_mall_seller_id: props.seller.id,
        is_deleted: false,
      },
    },
  );
  const existingSku =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        sku_code: props.body.sku_code,
      },
    });
  if (existingSku) {
    throw new HttpException("SKU code already exists", 409);
  }
  // Check if the option value combination already exists for this product
  const existingOptionValues = props.body.option_values.map((ov) => ({
    option_name: ov.option_name,
    option_value: ov.option_value,
  }));
  const allExistingVariants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: {
        shopping_mall_product_id: props.productId,
      },
      select: {
        optionValues: true,
      },
    });
  const hasMatchingCombination = allExistingVariants.some((variant) => {
    if (variant.optionValues.length !== props.body.option_values.length) {
      return false;
    }
    const variantOptions = variant.optionValues.map((ov) => ({
      option_name: ov.option_name,
      option_value: ov.option_value,
    }));
    return existingOptionValues.every((ov) =>
      variantOptions.some(
        (vo) =>
          vo.option_name === ov.option_name &&
          vo.option_value === ov.option_value,
      ),
    );
  });
  if (hasMatchingCombination) {
    throw new HttpException(
      "Option value combination already exists for this product",
      409,
    );
  }
  const created = await MyGlobal.prisma.shopping_mall_product_variants.create({
    data: {
      id: v4(),
      sku_code: props.body.sku_code,
      price_override: props.body.price_override ?? null,
      stock_quantity: props.body.stock_quantity ?? 0,
      product: {
        connect: {
          id: props.productId,
        },
      },
      optionValues: {
        create: props.body.option_values.map((optionValue) => ({
          id: v4(),
          option_name: optionValue.option_name,
          option_value: optionValue.option_value,
        })),
      },
    },
    ...ShoppingMallProductVariantTransformer.select(),
  });
  await MyGlobal.prisma.shopping_mall_inventory_histories.create({
    data: {
      id: v4(),
      shopping_mall_product_variant_id: created.id,
      quantity_change: created.stock_quantity,
      reason: "initial_stock",
      created_at: toISOStringSafe(new Date()),
    },
  });
  return await ShoppingMallProductVariantTransformer.transform(created);
}
