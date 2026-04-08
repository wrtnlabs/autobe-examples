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

export async function putEcommerceMallSellerSellersMeProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.IUpdate;
}): Promise<IEcommerceMallProductVariant> {
  // 1. Verify product ownership
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, ecommerce_mall_seller_id: true },
    });
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify variant exists and belongs to product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        ecommerce_mall_product_id: true,
        sku_code: true,
        price: true,
        quantity: true,
        deleted_at: true,
      },
    });
  if (variant.ecommerce_mall_product_id !== props.productId) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.deleted_at !== null) {
    throw new HttpException("Variant not found", 404);
  }
  // 3. Check SKU uniqueness if skuCode is being changed
  if (
    props.body.skuCode !== undefined &&
    props.body.skuCode !== variant.sku_code
  ) {
    const existingWithSku =
      await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
        where: {
          sku_code: props.body.skuCode,
          deleted_at: null,
          NOT: { id: props.variantId },
        },
      });
    if (existingWithSku) {
      throw new HttpException("SKU code already exists", 409);
    }
  }
  // 4. Update variant
  await MyGlobal.prisma.ecommerce_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      ...(props.body.skuCode !== undefined && { sku_code: props.body.skuCode }),
      ...(props.body.price !== undefined && { price: props.body.price }),
      ...(props.body.quantity !== undefined && {
        quantity: props.body.quantity,
      }),
      updated_at: new Date(),
    },
  });
  // 5. Handle option values update
  if (props.body.optionValues !== undefined) {
    await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.deleteMany(
      {
        where: { ecommerce_mall_product_variant_id: props.variantId },
      },
    );
    if (props.body.optionValues.length > 0) {
      await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.createMany(
        {
          data: props.body.optionValues.map((ov) => ({
            ecommerce_mall_product_variant_id: props.variantId as string,
            key: ov.key,
            value: ov.value,
          })) as any,
        },
      );
    }
  }
  // 6. Fetch and return updated variant
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
// export async function putEcommerceMallSellerSellersMeProductsProductIdVariantsVariantId(props: {
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