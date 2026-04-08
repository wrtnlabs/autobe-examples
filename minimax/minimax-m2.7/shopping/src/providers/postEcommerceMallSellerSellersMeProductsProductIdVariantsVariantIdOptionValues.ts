import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductVariantOptionValueCollector } from "../collectors/EcommerceMallProductVariantOptionValueCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantOptionValueTransformer } from "../transformers/EcommerceMallProductVariantOptionValueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerSellersMeProductsProductIdVariantsVariantIdOptionValues(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantOptionValue.ICreate;
}): Promise<IEcommerceMallProductVariantOptionValue> {
  // 1. Verify product exists and belongs to authenticated seller
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
      },
    });
  // Seller ownership validation
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify variant exists, belongs to product, and is not deleted
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        ecommerce_mall_product_id: true,
        deleted_at: true,
      },
    });
  // Verify variant belongs to the product
  if (variant.ecommerce_mall_product_id !== props.productId) {
    throw new HttpException(
      "Variant does not belong to the specified product",
      404,
    );
  }
  // Verify variant is not soft-deleted
  if (variant.deleted_at !== null) {
    throw new HttpException("Variant is deleted", 400);
  }
  // 3. Check for existing option with same key under this variant
  const existingOption =
    await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.findUnique(
      {
        where: {
          ecommerce_mall_product_variant_id_key: {
            ecommerce_mall_product_variant_id: props.variantId,
            key: props.body.key,
          },
        },
      },
    );
  // 4. Upsert: update existing or create new
  const record = await (async () => {
    if (existingOption !== null) {
      // Update existing option value (upsert behavior)
      return await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.update(
        {
          where: { id: existingOption.id },
          data: {
            value: props.body.value,
            updated_at: new Date(),
          },
          ...EcommerceMallProductVariantOptionValueTransformer.select(),
        },
      );
    } else {
      // Create new option value using Collector
      return await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.create(
        {
          data: await EcommerceMallProductVariantOptionValueCollector.collect({
            body: props.body,
            ecommerceMallProductVariants: { id: props.variantId },
            ecommerceMallSellers: { id: props.seller.id },
            ecommerceMallSellerSessions: { id: props.seller.session_id },
          }),
          ...EcommerceMallProductVariantOptionValueTransformer.select(),
        },
      );
    }
  })();
  // 5. Return transformed response
  return await EcommerceMallProductVariantOptionValueTransformer.transform(
    record,
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
// export async function postEcommerceMallSellerSellersMeProductsProductIdVariantsVariantIdOptionValues(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   body: IEcommerceMallProductVariantOptionValue.ICreate;
// }): Promise<IEcommerceMallProductVariantOptionValue> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.create({
//     data: await EcommerceMallProductVariantOptionValueCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallProductVariantOptionValueTransformer.select(),
//   });
//   return await EcommerceMallProductVariantOptionValueTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------