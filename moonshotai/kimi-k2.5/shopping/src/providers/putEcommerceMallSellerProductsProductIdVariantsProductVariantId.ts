import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
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

export async function putEcommerceMallSellerProductsProductIdVariantsProductVariantId(props: {
  seller: SellerPayload;
  productId: string;
  productVariantId: string;
  body: IEcommerceMallProductVariant.IUpdate;
}): Promise<IEcommerceMallProductVariant> {
  // Verify product exists and seller owns it
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!product)
    throw new HttpException("Product not found or access denied", 404);
  // Verify variant exists and belongs to product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.productVariantId,
        product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        sku_code: true,
        price: true,
        variantOptions: { select: { option_name: true, option_value: true } },
      },
    });
  if (!variant) throw new HttpException("Variant not found", 404);
  // SKU uniqueness check if changing
  if (props.body.skuCode && props.body.skuCode !== variant.sku_code) {
    const existing =
      await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
        where: {
          sku_code: props.body.skuCode,
          id: { not: props.productVariantId },
          deleted_at: null,
        },
        select: { id: true },
      });
    if (existing) throw new HttpException("SKU already in use", 409);
  }
  // Execute snapshot + update in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create snapshot of current state
    const snapshotId = v4();
    await tx.ecommerce_mall_product_variant_snapshots.create({
      data: {
        id: snapshotId,
        product_variant_id: props.productVariantId,
        sku_code: variant.sku_code,
        price: variant.price ?? 0,
        created_at: new Date(),
      },
    });
    // Copy current options to snapshot
    for (const opt of variant.variantOptions) {
      await tx.ecommerce_mall_product_variant_snapshot_option_values.create({
        data: {
          id: v4(),
          ecommerce_mall_product_variant_snapshot_id: snapshotId,
          option_name: opt.option_name,
          option_value: opt.option_value,
          created_at: new Date(),
        },
      });
    }
    // Update variant fields
    const updateData: Prisma.ecommerce_mall_product_variantsUpdateInput = {
      updated_at: new Date(),
    };
    if (props.body.skuCode !== undefined)
      updateData.sku_code = props.body.skuCode;
    if (props.body.price !== undefined) updateData.price = props.body.price;
    await tx.ecommerce_mall_product_variants.update({
      where: { id: props.productVariantId },
      data: updateData,
    });
    // Replace options if provided
    if (props.body.options !== undefined && props.body.options.length > 0) {
      await tx.ecommerce_mall_product_variant_options.deleteMany({
        where: { product_variant_id: props.productVariantId },
      });
      for (const opt of props.body.options) {
        await tx.ecommerce_mall_product_variant_options.create({
          data: {
            id: v4(),
            product_variant_id: props.productVariantId,
            option_name: opt.optionName,
            option_value: opt.optionValue,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      }
    }
  });
  // Return updated variant
  const updated =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.productVariantId, deleted_at: null },
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
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallSellerProductsProductIdVariantsProductVariantId(props: {
//   seller: SellerPayload;
//   productId: string;
//   productVariantId: string;
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