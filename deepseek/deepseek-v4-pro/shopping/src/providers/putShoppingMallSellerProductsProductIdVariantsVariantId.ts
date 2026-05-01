import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
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
      where: { id: props.productId, deleted_at: null },
      select: { id: true, shopping_mall_seller_id: true },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const currentVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: {
        id: props.variantId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        code: true,
        price: true,
        optionValues: {
          select: { key: true, value: true },
        },
        inventoryRecords: {
          select: { quantity_change: true },
        },
      },
    });
  if (
    props.body.code !== undefined &&
    props.body.code !== currentVariant.code
  ) {
    const existingSku =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
        where: { code: props.body.code, NOT: { id: props.variantId } },
      });
    if (existingSku !== null) {
      throw new HttpException("SKU code already in use", 409);
    }
  }
  const currentStockQuantity: number = currentVariant.inventoryRecords.reduce(
    (
      sum: number,
      record: {
        quantity_change: number;
      },
    ) => sum + record.quantity_change,
    0,
  );
  const optionValuesString: string = currentVariant.optionValues
    .map((ov: { key: string; value: string }) => `${ov.key}: ${ov.value}`)
    .join(", ");
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_product_variant_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_product_variant_id: props.variantId,
        shopping_mall_product_snapshot_id: null,
        sku_code: currentVariant.code,
        option_values: optionValuesString,
        price: currentVariant.price,
        stock_quantity: currentStockQuantity,
        created_at: new Date(),
      },
    });
    if (props.body.optionValues !== undefined) {
      await tx.shopping_mall_product_variant_option_values.deleteMany({
        where: { shopping_mall_product_variant_id: props.variantId },
      });
      await tx.shopping_mall_product_variant_option_values.createMany({
        data: props.body.optionValues.map((ov) => ({
          id: v4(),
          shopping_mall_product_variant_id: props.variantId,
          key: ov.key,
          value: ov.value,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      });
    }
    await tx.shopping_mall_product_variants.update({
      where: { id: props.variantId },
      data: {
        ...(props.body.code !== undefined && { code: props.body.code }),
        ...(props.body.price !== undefined && { price: props.body.price }),
        updated_at: new Date(),
      },
    });
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      ...ShoppingMallProductVariantTransformer.select(),
    });
  return await ShoppingMallProductVariantTransformer.transform(updated);
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
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putShoppingMallSellerProductsProductIdVariantsVariantId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   body: IShoppingMallProductVariant.IUpdate;
// }): Promise<IShoppingMallProductVariant> {
//   await MyGlobal.prisma.shopping_mall_product_variants.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
//     where: { ... },
//     ...ShoppingMallProductVariantTransformer.select(),
//   });
//   return await ShoppingMallProductVariantTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------