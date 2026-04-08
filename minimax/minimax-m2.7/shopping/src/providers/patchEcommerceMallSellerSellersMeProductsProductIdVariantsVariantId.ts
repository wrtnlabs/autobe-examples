import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
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

export async function patchEcommerceMallSellerSellersMeProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.IUpdate;
}): Promise<IEcommerceMallProductVariant> {
  // Step 1: Verify product exists and belongs to seller
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, ecommerce_mall_seller_id: true },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Find variant and verify it belongs to product and is not soft-deleted
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        ecommerce_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (variant === null) {
    throw new HttpException("Variant not found", 404);
  }
  // Step 3: Validate SKU uniqueness if skuCode is being updated
  if (props.body.skuCode !== undefined) {
    const existingSkuVariant =
      await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
        where: {
          sku_code: props.body.skuCode,
          id: { not: props.variantId },
          deleted_at: null,
        },
        select: { id: true },
      });
    if (existingSkuVariant !== null) {
      throw new HttpException("SKU code already exists", 400);
    }
  }
  // Step 4: Handle option values update if provided (must be done before main update)
  if (props.body.optionValues !== undefined) {
    // Delete existing option values
    await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.deleteMany(
      {
        where: { ecommerce_mall_product_variant_id: props.variantId },
      },
    );
    // Create new option values if array is not empty
    if (props.body.optionValues.length > 0) {
      const now = new Date();
      await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.createMany(
        {
          data: props.body.optionValues.map((opt) => ({
            id: v4(),
            ecommerce_mall_product_variant_id: props.variantId as string,
            key: opt.key,
            value: opt.value,
            created_at: now,
            updated_at: now,
          })),
        },
      );
    }
  }
  // Step 5: Build update data (only include fields that are defined in body)
  const updateData: {
    sku_code?: string;
    price?: number | null;
    quantity?: number & tags.Type<"int32">;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.skuCode !== undefined) {
    updateData.sku_code = props.body.skuCode;
  }
  if (props.body.price !== undefined) {
    updateData.price = props.body.price;
  }
  if (props.body.quantity !== undefined) {
    updateData.quantity = props.body.quantity;
  }
  // Step 6: Update the variant
  await MyGlobal.prisma.ecommerce_mall_product_variants.update({
    where: { id: props.variantId },
    data: updateData,
  });
  // Step 7: Return updated variant
  const updated =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
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
// import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerSellersMeProductsProductIdVariantsVariantId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   body: IEcommerceMallProductVariant.IUpdate;
// }): Promise<IEcommerceMallProductVariant> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_variants.findFirstOrThrow({
//     ...EcommerceMallProductVariantTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallProductVariantTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------