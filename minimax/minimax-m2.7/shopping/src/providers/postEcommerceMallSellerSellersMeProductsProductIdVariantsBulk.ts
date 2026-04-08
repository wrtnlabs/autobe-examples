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
import { EcommerceMallProductVariantAtBulkTransformer } from "../transformers/EcommerceMallProductVariantAtBulkTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerSellersMeProductsProductIdVariantsBulk(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.ICreateBulk;
}): Promise<IEcommerceMallProductVariant.IBulk[]> {
  // 1. Verify product ownership
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      ecommerce_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: {
      id: true,
      ecommerce_mall_seller_id: true,
    },
  });
  if (product === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Extract SKU codes and check for duplicates
  const skuCodes: string[] = props.body.variants.map((v) => v.skuCode);
  const existingSkus =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: {
        sku_code: { in: skuCodes },
        deleted_at: null,
      },
      select: { sku_code: true },
    });
  if (existingSkus.length > 0) {
    throw new HttpException(
      JSON.stringify({ duplicateSkus: existingSkus.map((s) => s.sku_code) }),
      409,
    );
  }
  // 3. Create variants and option values in transaction
  const createdVariants = await MyGlobal.prisma.$transaction(async (tx) => {
    const variantIds: string[] = [];
    // Create all variants
    for (const variant of props.body.variants) {
      const variantId: string = v4();
      variantIds.push(variantId);
      await tx.ecommerce_mall_product_variants.create({
        data: {
          id: variantId,
          ecommerce_mall_product_id: props.productId,
          sku_code: variant.skuCode,
          price: variant.price ?? null,
          quantity: 0,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
      // Create option values for this variant
      for (const optionValue of variant.optionValues) {
        const optionValueId: string = v4();
        await tx.ecommerce_mall_product_variant_option_values.create({
          data: {
            id: optionValueId,
            ecommerce_mall_product_variant_id: variantId,
            key: optionValue.key,
            value: optionValue.value,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      }
    }
    // Query created variants with option values
    const created = await tx.ecommerce_mall_product_variants.findMany({
      where: { id: { in: variantIds } },
      ...EcommerceMallProductVariantAtBulkTransformer.select(),
    });
    return created;
  });
  // 4. Transform and return all created variants
  return await ArrayUtil.asyncMap(
    createdVariants,
    EcommerceMallProductVariantAtBulkTransformer.transform,
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
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSellerSellersMeProductsProductIdVariantsBulk(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IEcommerceMallProductVariant.ICreateBulk;
// }): Promise<IEcommerceMallProductVariant.IBulk> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_variants.findFirstOrThrow({
//     ...EcommerceMallProductVariantAtBulkTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallProductVariantAtBulkTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------