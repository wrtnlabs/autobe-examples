import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
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
import { EcommerceMallProductVariantTransformer } from "../transformers/EcommerceMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string;
  variantId: string;
  body: IEcommerceMallProductVariant.IUpdate;
}): Promise<IEcommerceMallProductVariant> {
  // Verify product ownership
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: { seller_id: true },
  });
  if (!product || product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch variant ensuring it exists and belongs to this product
  const existingVariant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        sku_code: true,
        price: true,
        created_at: true,
        updated_at: true,
        variantOptions: {
          select: { option_name: true, option_value: true },
        } satisfies Prisma.ecommerce_mall_product_variant_optionsFindManyArgs,
      },
    });
  if (!existingVariant) {
    throw new HttpException("Product variant not found", 404);
  }
  // SKU uniqueness validation if changing
  if (
    props.body.skuCode !== undefined &&
    props.body.skuCode !== existingVariant.sku_code
  ) {
    const existingSku =
      await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
        where: {
          product_id: props.productId,
          sku_code: props.body.skuCode,
          id: { not: props.variantId },
          deleted_at: null,
        },
      });
    if (existingSku) {
      throw new HttpException("SKU code already exists for this product", 400);
    }
  }
  // Execute update in transaction
  const updatedVariant = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create snapshot of current state
    const now = new Date();
    await tx.ecommerce_mall_product_variant_snapshots.create({
      data: {
        id: v4(),
        product_variant_id: props.variantId,
        sku_code: existingVariant.sku_code,
        price: existingVariant.price ?? 0,
        created_at: now,
      },
    });
    // Update option values if provided
    if (
      props.body.optionValues !== undefined &&
      props.body.optionValues.length > 0
    ) {
      // Delete existing options
      await tx.ecommerce_mall_product_variant_options.deleteMany({
        where: { product_variant_id: props.variantId },
      });
      // Insert new options
      for (const option of props.body.optionValues) {
        await tx.ecommerce_mall_product_variant_options.create({
          data: {
            id: v4(),
            product_variant_id: props.variantId,
            option_name: option.optionName,
            option_value: option.optionValue,
            created_at: now,
            updated_at: now,
          },
        });
      }
    }
    // Update the variant
    const updateData: Prisma.ecommerce_mall_product_variantsUpdateInput = {
      updated_at: now,
    };
    if (props.body.skuCode !== undefined) {
      updateData.sku_code = props.body.skuCode;
    }
    if (props.body.price !== undefined) {
      updateData.price = props.body.price;
    }
    const result = await tx.ecommerce_mall_product_variants.update({
      where: { id: props.variantId },
      data: updateData,
      ...EcommerceMallProductVariantTransformer.select(),
    });
    return result;
  });
  return await EcommerceMallProductVariantTransformer.transform(updatedVariant);
}
