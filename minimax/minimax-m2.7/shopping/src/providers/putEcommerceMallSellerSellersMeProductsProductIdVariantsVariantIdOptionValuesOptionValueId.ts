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
import { EcommerceMallProductVariantOptionValueTransformer } from "../transformers/EcommerceMallProductVariantOptionValueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerSellersMeProductsProductIdVariantsVariantIdOptionValuesOptionValueId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  optionValueId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantOptionValue.IUpdate;
}): Promise<IEcommerceMallProductVariantOptionValue> {
  // Step 1: Verify product exists and belongs to the authenticated seller
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, ecommerce_mall_seller_id: true },
    });
  // Step 2: Ownership check - seller must own the product
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Verify variant exists and belongs to the product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { id: true, ecommerce_mall_product_id: true },
    });
  if (variant.ecommerce_mall_product_id !== props.productId) {
    throw new HttpException("Variant not found", 404);
  }
  // Step 4: Verify option value exists and belongs to the variant
  const optionValue =
    await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.findUniqueOrThrow(
      {
        where: { id: props.optionValueId },
        select: {
          id: true,
          ecommerce_mall_product_variant_id: true,
          key: true,
          value: true,
        },
      },
    );
  if (optionValue.ecommerce_mall_product_variant_id !== props.variantId) {
    throw new HttpException("Option value not found", 404);
  }
  // Step 5: Check uniqueness constraint - if key is being updated, ensure no other option value on same variant has same key
  if (props.body.key !== undefined) {
    const existingWithKey =
      await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.findFirst(
        {
          where: {
            ecommerce_mall_product_variant_id: props.variantId,
            key: props.body.key,
            NOT: { id: props.optionValueId },
          },
        },
      );
    if (existingWithKey !== null) {
      throw new HttpException(
        "An option with this key already exists for this variant",
        400,
      );
    }
  }
  // Step 6: Build update data with only provided fields
  const updatedData: {
    key?: string;
    value?: string;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.key !== undefined) {
    updatedData.key = props.body.key;
  }
  if (props.body.value !== undefined) {
    updatedData.value = props.body.value;
  }
  // Step 7: Update the option value record
  await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.update({
    where: { id: props.optionValueId },
    data: updatedData,
  });
  // Step 8: Fetch the updated record and return transformed result
  const updated =
    await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.findUniqueOrThrow(
      {
        where: { id: props.optionValueId },
        ...EcommerceMallProductVariantOptionValueTransformer.select(),
      },
    );
  return await EcommerceMallProductVariantOptionValueTransformer.transform(
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
// import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallSellerSellersMeProductsProductIdVariantsVariantIdOptionValuesOptionValueId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   optionValueId: string & tags.Format<"uuid">;
//   body: IEcommerceMallProductVariantOptionValue.IUpdate;
// }): Promise<IEcommerceMallProductVariantOptionValue> {
//   await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallProductVariantOptionValueTransformer.select(),
//   });
//   return await EcommerceMallProductVariantOptionValueTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------