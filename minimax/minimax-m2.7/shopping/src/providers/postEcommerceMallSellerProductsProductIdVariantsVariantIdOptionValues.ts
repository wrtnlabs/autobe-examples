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
import { EcommerceMallProductVariantOptionValueCollector } from "../collectors/EcommerceMallProductVariantOptionValueCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantOptionValueTransformer } from "../transformers/EcommerceMallProductVariantOptionValueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerProductsProductIdVariantsVariantIdOptionValues(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantOptionValue.ICreate;
}): Promise<IEcommerceMallProductVariantOptionValue> {
  // Verify product exists, belongs to seller, and is not deleted
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      ecommerce_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (product === null) {
    throw new HttpException(
      "Product not found or you do not have permission",
      403,
    );
  }
  // Verify variant exists, belongs to product, and is not deleted
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
    throw new HttpException(
      "Variant not found or does not belong to this product",
      404,
    );
  }
  // Check for duplicate option key within this variant
  const existingOption =
    await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.findFirst(
      {
        where: {
          ecommerce_mall_product_variant_id: props.variantId,
          key: props.body.key,
        },
        select: { id: true },
      },
    );
  if (existingOption !== null) {
    throw new HttpException("Option key already exists for this variant", 409);
  }
  // Create the option value using collector
  const created =
    await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.create({
      data: await EcommerceMallProductVariantOptionValueCollector.collect({
        body: props.body,
        ecommerceMallProductVariants: { id: props.variantId },
        ecommerceMallProducts: { id: props.productId },
        ecommerceMallSellers: { id: props.seller.id },
        ecommerceMallSellerSessions: { id: props.seller.session_id },
      }),
      ...EcommerceMallProductVariantOptionValueTransformer.select(),
    });
  return await EcommerceMallProductVariantOptionValueTransformer.transform(
    created,
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
// export async function postEcommerceMallSellerProductsProductIdVariantsVariantIdOptionValues(props: {
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