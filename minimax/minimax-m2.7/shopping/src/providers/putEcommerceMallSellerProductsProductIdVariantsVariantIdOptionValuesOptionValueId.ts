import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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
import { EcommerceMallProductVariantOptionValueTransformer } from "../transformers/EcommerceMallProductVariantOptionValueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerProductsProductIdVariantsVariantIdOptionValuesOptionValueId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  optionValueId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantOptionValue.IUpdate;
}): Promise<IEcommerceMallProductVariantOptionValue> {
  // Step 1: Verify product exists and belongs to the seller
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      ecommerce_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (product === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Verify variant exists, belongs to product, and is not deleted
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
  // Step 3: Verify option value exists and belongs to the variant
  const existingOptionValue =
    await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.findFirst(
      {
        where: {
          id: props.optionValueId,
          ecommerce_mall_product_variant_id: props.variantId,
        },
        select: { id: true, key: true, value: true },
      },
    );
  if (existingOptionValue === null) {
    throw new HttpException("Option value not found", 404);
  }
  // Step 4: Check uniqueness constraint if key or value is being updated
  if (props.body.key !== undefined || props.body.value !== undefined) {
    const newKey = props.body.key ?? existingOptionValue.key;
    const newValue = props.body.value ?? existingOptionValue.value;
    const duplicateOptionValue =
      await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.findFirst(
        {
          where: {
            ecommerce_mall_product_variant_id: props.variantId,
            id: { not: props.optionValueId },
            key: newKey,
            value: newValue,
          },
          select: { id: true },
        },
      );
    if (duplicateOptionValue !== null) {
      throw new HttpException(
        "Option with the same key and value already exists for this variant",
        409,
      );
    }
  }
  // Step 5: Build update data
  const updateData: {
    key?: string;
    value?: string;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.key !== undefined) {
    updateData.key = props.body.key;
  }
  if (props.body.value !== undefined) {
    updateData.value = props.body.value;
  }
  // Step 6: Update the option value
  await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.update({
    where: { id: props.optionValueId },
    data: updateData,
  });
  // Step 7: Update the parent variant's updated_at timestamp
  await MyGlobal.prisma.ecommerce_mall_product_variants.update({
    where: { id: props.variantId },
    data: { updated_at: new Date() },
  });
  // Step 8: Fetch and return the updated option value
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
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallSellerProductsProductIdVariantsVariantIdOptionValuesOptionValueId(props: {
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