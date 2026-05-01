import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantOptionValueTransformer } from "../transformers/ShoppingMallProductVariantOptionValueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerProductsProductIdVariantsVariantIdOptionsOptionId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariantOptionValue.IUpdate;
}): Promise<IShoppingMallProductVariantOptionValue> {
  if (props.body.key.length === 0 || props.body.value.length === 0) {
    throw new HttpException("Key and value cannot be empty", 400);
  }
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId, deleted_at: null },
      select: { id: true, shopping_mall_seller_id: true },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId, deleted_at: null },
      select: { id: true, shopping_mall_product_id: true },
    });
  if (variant.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Variant not found for this product", 404);
  }
  const optionValue =
    await MyGlobal.prisma.shopping_mall_product_variant_option_values.findUniqueOrThrow(
      {
        where: { id: props.optionId },
        select: { id: true, shopping_mall_product_variant_id: true, key: true },
      },
    );
  if (optionValue.shopping_mall_product_variant_id !== props.variantId) {
    throw new HttpException("Option value not found for this variant", 404);
  }
  if (props.body.key !== optionValue.key) {
    const existing =
      await MyGlobal.prisma.shopping_mall_product_variant_option_values.findFirst(
        {
          where: {
            shopping_mall_product_variant_id: props.variantId,
            key: props.body.key,
            id: { not: props.optionId },
          },
          select: { id: true },
        },
      );
    if (existing !== null) {
      throw new HttpException(
        "Another option value with this key already exists in this variant",
        409,
      );
    }
  }
  const variantForSnapshot =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        code: true,
        price: true,
        optionValues: {
          select: { key: true, value: true },
        },
      },
    });
  const stockAggregate =
    await MyGlobal.prisma.shopping_mall_inventory_records.aggregate({
      where: { shopping_mall_product_variant_id: props.variantId },
      _sum: { quantity_change: true },
    });
  const stockQuantity = stockAggregate._sum.quantity_change ?? 0;
  const optionValuesStr = variantForSnapshot.optionValues
    .map((ov) => `${ov.key}: ${ov.value}`)
    .join(", ");
  await MyGlobal.prisma.shopping_mall_product_variant_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_product_variant_id: props.variantId,
      shopping_mall_product_snapshot_id: null,
      sku_code: variantForSnapshot.code,
      option_values: optionValuesStr,
      price: variantForSnapshot.price,
      stock_quantity: stockQuantity,
      created_at: new Date(),
    },
  });
  await MyGlobal.prisma.shopping_mall_product_variant_option_values.update({
    where: { id: props.optionId },
    data: {
      key: props.body.key,
      value: props.body.value,
      updated_at: new Date(),
    },
  });
  await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: props.variantId },
    data: { updated_at: new Date() },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_product_variant_option_values.findUniqueOrThrow(
      {
        where: { id: props.optionId },
        ...ShoppingMallProductVariantOptionValueTransformer.select(),
      },
    );
  return await ShoppingMallProductVariantOptionValueTransformer.transform(
    updated,
  );
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putShoppingMallSellerProductsProductIdVariantsVariantIdOptionsOptionId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   optionId: string & tags.Format<"uuid">;
//   body: IShoppingMallProductVariantOptionValue.IUpdate;
// }): Promise<IShoppingMallProductVariantOptionValue> {
//   await MyGlobal.prisma.shopping_mall_product_variant_option_values.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.shopping_mall_product_variant_option_values.findUniqueOrThrow({
//     where: { ... },
//     ...ShoppingMallProductVariantOptionValueTransformer.select(),
//   });
//   return await ShoppingMallProductVariantOptionValueTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------