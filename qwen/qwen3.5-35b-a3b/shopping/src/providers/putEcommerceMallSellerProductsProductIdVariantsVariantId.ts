import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantTransformer } from "../transformers/EcommerceMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.IUpdate;
}): Promise<IEcommerceMallProductVariant> {
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found or not owned by seller", 404);
  }
  const existingVariant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        product_id: props.productId,
        deleted_at: null,
      },
    });
  if (existingVariant === null) {
    throw new HttpException("Variant not found", 404);
  }
  if (props.body.sku_code !== undefined) {
    const duplicateSku =
      await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
        where: {
          product_id: props.productId,
          sku_code: props.body.sku_code,
          id: { not: props.variantId },
          deleted_at: null,
        },
      });
    if (duplicateSku !== null) {
      throw new HttpException("SKU code already exists for this product", 409);
    }
  }
  if (props.body.stock_quantity !== undefined) {
    if (props.body.stock_quantity < 0) {
      throw new HttpException("Stock quantity must be non-negative", 422);
    }
  }
  if (props.body.price !== undefined && props.body.price !== null) {
    if (props.body.price <= 0) {
      throw new HttpException("Price must be positive", 422);
    }
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.create({
    data: {
      id: v4(),
      product_variant_id: props.variantId,
      product_id: props.productId,
      seller_id: props.seller.id,
      sku_code: existingVariant.sku_code,
      option_values: existingVariant.option_values,
      price: existingVariant.price,
      stock_quantity: existingVariant.stock_quantity,
      created_at: now,
      updated_at: now,
    },
  });
  const updateData: Prisma.ecommerce_mall_product_variantsUpdateInput = {
    updated_at: now,
  };
  if (props.body.sku_code !== undefined) {
    updateData.sku_code = props.body.sku_code;
  }
  if (props.body.option_values !== undefined) {
    updateData.option_values = JSON.stringify(props.body.option_values);
  }
  if (props.body.price !== undefined) {
    updateData.price = props.body.price;
  }
  if (props.body.stock_quantity !== undefined) {
    updateData.stock_quantity = props.body.stock_quantity;
  }
  await MyGlobal.prisma.ecommerce_mall_product_variants.update({
    where: {
      id: props.variantId,
    },
    data: updateData,
  });
  const updated =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: {
        id: props.variantId,
      },
      ...EcommerceMallProductVariantTransformer.select(),
    });
  return await EcommerceMallProductVariantTransformer.transform(updated);
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
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallSellerProductsProductIdVariantsVariantId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   body: IEcommerceMallProductVariant.IUpdate;
// }): Promise<IEcommerceMallProductVariant> {
//   await MyGlobal.prisma.ecommerce_mall_product_variants.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallProductVariantTransformer.select(),
//   });
//   return await EcommerceMallProductVariantTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------