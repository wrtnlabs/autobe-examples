import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantOptionTransformer } from "../transformers/EcommerceMallProductVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerProductsProductIdVariantsProductVariantIdOptionsProductVariantOptionId(props: {
  seller: SellerPayload;
  productId: string;
  productVariantId: string;
  productVariantOptionId: string;
  body: IEcommerceMallProductVariantOption.IUpdate;
}): Promise<IEcommerceMallProductVariantOption> {
  // Verify product exists and seller owns it
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
  // Verify variant exists and belongs to the product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.productVariantId },
      select: { id: true, product_id: true },
    });
  if (variant === null) {
    throw new HttpException("Product variant not found", 404);
  }
  if (variant.product_id !== props.productId) {
    throw new HttpException(
      "Product variant does not belong to this product",
      400,
    );
  }
  // Verify option exists and belongs to the variant
  const currentOption =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.findUnique({
      where: { id: props.productVariantOptionId },
      select: {
        id: true,
        product_variant_id: true,
        option_name: true,
        option_value: true,
      },
    });
  if (currentOption === null) {
    throw new HttpException("Product variant option not found", 404);
  }
  if (currentOption.product_variant_id !== props.productVariantId) {
    throw new HttpException("Option does not belong to this variant", 400);
  }
  // Determine effective values for uniqueness check
  const newOptionName = props.body.optionName ?? currentOption.option_name;
  const newOptionValue = props.body.optionValue ?? currentOption.option_value;
  // Check uniqueness: same variant cannot have duplicate option name+value combination
  if (
    props.body.optionName !== undefined ||
    props.body.optionValue !== undefined
  ) {
    const existingOption =
      await MyGlobal.prisma.ecommerce_mall_product_variant_options.findFirst({
        where: {
          product_variant_id: props.productVariantId,
          option_name: newOptionName,
          option_value: newOptionValue,
          NOT: { id: props.productVariantOptionId },
        },
      });
    if (existingOption !== null) {
      throw new HttpException(
        "An option with the same name and value already exists for this variant",
        409,
      );
    }
  }
  // Update the option
  await MyGlobal.prisma.ecommerce_mall_product_variant_options.update({
    where: { id: props.productVariantOptionId },
    data: {
      ...(props.body.optionName !== undefined && {
        option_name: props.body.optionName,
      }),
      ...(props.body.optionValue !== undefined && {
        option_value: props.body.optionValue,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch and return updated option using transformer
  const updated =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.findUniqueOrThrow(
      {
        where: { id: props.productVariantOptionId },
        ...EcommerceMallProductVariantOptionTransformer.select(),
      },
    );
  return await EcommerceMallProductVariantOptionTransformer.transform(updated);
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
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallSellerProductsProductIdVariantsProductVariantIdOptionsProductVariantOptionId(props: {
//   seller: SellerPayload;
//   productId: string;
//   productVariantId: string;
//   productVariantOptionId: string;
//   body: IEcommerceMallProductVariantOption.IUpdate;
// }): Promise<IEcommerceMallProductVariantOption> {
//   await MyGlobal.prisma.ecommerce_mall_product_variant_options.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_product_variant_options.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallProductVariantOptionTransformer.select(),
//   });
//   return await EcommerceMallProductVariantOptionTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------