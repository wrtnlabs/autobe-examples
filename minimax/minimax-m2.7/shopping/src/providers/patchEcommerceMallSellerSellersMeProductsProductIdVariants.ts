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

export async function patchEcommerceMallSellerSellersMeProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.BulkUpdateRequest;
}): Promise<IEcommerceMallProductVariant.BulkUpdateResponse> {
  // 1. Verify product exists and belongs to authenticated seller, fetch details for snapshot
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      ecommerce_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      description: true,
      base_price: true,
      category: {
        select: {
          name: true,
        },
      },
    },
  });
  if (product === null) {
    throw new HttpException("Product not found or access denied", 403);
  }
  // 2. Extract all variant IDs from request
  const variantIds = props.body.items.map((item) => item.variantId) as Array<
    string & tags.Format<"uuid">
  >;
  // 3. Query all variants to verify they belong to product and are not deleted
  const existingVariants =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: {
        id: { in: variantIds },
        ecommerce_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        sku_code: true,
        price: true,
        quantity: true,
        optionValues: {
          select: {
            id: true,
            key: true,
            value: true,
          },
        },
      },
    });
  // Verify all requested variants exist and belong to product
  if (existingVariants.length !== variantIds.length) {
    throw new HttpException(
      "One or more variants not found or do not belong to this product",
      400,
    );
  }
  // 4. Check SKU uniqueness for any SKU updates across entire platform
  const skuUpdates = props.body.items.filter(
    (item) => item.skuCode !== undefined,
  );
  if (skuUpdates.length > 0) {
    const newSkus = skuUpdates.map((item) => item.skuCode as string);
    // Check for duplicate SKUs within the request itself
    const uniqueSkus = new Set(newSkus);
    if (uniqueSkus.size !== newSkus.length) {
      throw new HttpException("Duplicate SKU codes in request", 400);
    }
    // Check if any new SKU already exists in database (excluding current variants)
    const existingSkuVariants =
      await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
        where: {
          sku_code: { in: newSkus },
          deleted_at: null,
          NOT: { id: { in: variantIds } },
        },
        select: {
          sku_code: true,
        },
      });
    if (existingSkuVariants.length > 0) {
      throw new HttpException(
        "SKU code already exists on another variant",
        409,
      );
    }
  }
  // 5. Execute updates within a transaction
  const updatedVariants = await MyGlobal.prisma.$transaction(async (tx) => {
    const results: Array<
      Prisma.ecommerce_mall_product_variantsGetPayload<
        ReturnType<typeof EcommerceMallProductVariantTransformer.select>
      >
    > = [];
    for (const item of props.body.items) {
      const currentVariant = existingVariants.find(
        (v) => v.id === item.variantId,
      );
      if (!currentVariant) {
        throw new HttpException("Variant not found during update", 400);
      }
      // Build update data with only provided fields (partial update)
      const updateData: {
        sku_code?: string;
        price?: number | null;
        quantity?: number & tags.Type<"int32">;
        updated_at: Date;
      } = {
        updated_at: new Date(),
      };
      if (item.skuCode !== undefined) {
        updateData.sku_code = item.skuCode;
      }
      if (item.price !== undefined) {
        updateData.price = item.price;
      }
      if (item.quantity !== undefined) {
        updateData.quantity = item.quantity;
      }
      // Update the variant
      const updatedVariant = await tx.ecommerce_mall_product_variants.update({
        where: { id: item.variantId },
        data: updateData,
        ...EcommerceMallProductVariantTransformer.select(),
      });
      // Create snapshot capturing the previous state before update
      const snapshotId = v4();
      const now = new Date();
      await tx.ecommerce_mall_product_snapshots.create({
        data: {
          id: snapshotId,
          ecommerce_mall_product_id: props.productId,
          ecommerce_mall_seller_id: props.seller.id,
          name: product.name,
          description: product.description,
          base_price: product.base_price,
          category_name: product.category?.name ?? null,
          created_at: now,
        },
      });
      await tx.ecommerce_mall_product_snapshot_variants.create({
        data: {
          id: v4(),
          ecommerce_mall_product_snapshot_id: snapshotId,
          sku: currentVariant.sku_code,
          price_override: currentVariant.price,
          stock_quantity: currentVariant.quantity,
          created_at: now,
        },
      });
      // Snapshot option values for audit trail
      for (const optionValue of currentVariant.optionValues) {
        await tx.ecommerce_mall_product_snapshot_variant_option_values.create({
          data: {
            id: v4(),
            ecommerce_mall_product_snapshot_variant_id: snapshotId,
            key: optionValue.key,
            value: optionValue.value,
            created_at: now,
          },
        });
      }
      results.push(updatedVariant);
    }
    return results;
  });
  // 6. Transform and return updated variants
  const variants = await ArrayUtil.asyncMap(
    updatedVariants,
    EcommerceMallProductVariantTransformer.transform,
  );
  return { variants };
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
// export async function patchEcommerceMallSellerSellersMeProductsProductIdVariants(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IEcommerceMallProductVariant.BulkUpdateRequest;
// }): Promise<IEcommerceMallProductVariant.BulkUpdateResponse> {
//   return {
//     variants: await ArrayUtil.asyncMap(..., (r) => EcommerceMallProductVariantTransformer.transform(r)),
//   };
// }
// ```
//--------------------------------------------------------------