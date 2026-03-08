import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
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
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.IUpdate;
}): Promise<IEcommerceMallProductVariant> {
  // Verify variant belongs to seller's product
  const existingVariant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.variantId },
      include: { product: true },
    });
  if (!existingVariant) {
    throw new HttpException("Variant not found", 404);
  }
  if (existingVariant.product_id !== props.productId) {
    throw new HttpException("Variant does not belong to this product", 403);
  }
  // Validate product ownership
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product || product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate SKU uniqueness if provided
  if (
    props.body.sku_code !== undefined &&
    props.body.sku_code !== existingVariant.sku_code
  ) {
    const duplicate =
      await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
        where: {
          sku_code: props.body.sku_code,
          product_id: props.productId,
          id: {
            not: props.variantId,
          },
          deleted_at: null,
        },
      });
    if (duplicate) {
      throw new HttpException("SKU code must be unique within product", 400);
    }
  }
  // Validate stock constraint - can't deactivate all variants
  if (props.body.stock_quantity === 0 && props.body.is_active === false) {
    const activeCount =
      await MyGlobal.prisma.ecommerce_mall_product_variants.count({
        where: {
          product_id: props.productId,
          is_active: true,
          deleted_at: null,
          id: { not: props.variantId },
        },
      });
    if (activeCount === 0) {
      throw new HttpException("Cannot deactivate the last active variant", 400);
    }
  }
  // Prepare partial update data
  const updateData: Prisma.ecommerce_mall_product_variantsUpdateInput = {};
  if (props.body.sku_code !== undefined) {
    updateData.sku_code = props.body.sku_code;
  }
  if (props.body.option_values !== undefined) {
    updateData.option_values = JSON.stringify(props.body.option_values);
  }
  if (props.body.price_override !== undefined) {
    updateData.price_override = props.body.price_override;
  }
  if (props.body.stock_quantity !== undefined) {
    updateData.stock_quantity = props.body.stock_quantity;
  }
  if (props.body.is_active !== undefined) {
    updateData.is_active = props.body.is_active;
  }
  // Execute update
  const updatedVariant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.update({
      where: { id: props.variantId },
      data: updateData,
      include: { product: EcommerceMallProductAtSummaryTransformer.select() },
    });
  // Return transformed response
  return {
    id: updatedVariant.id,
    product: await EcommerceMallProductAtSummaryTransformer.transform(
      updatedVariant.product,
    ),
    skuCode: updatedVariant.sku_code,
    optionValues: JSON.parse(updatedVariant.option_values),
    priceOverride: updatedVariant.price_override ?? null,
    stockQuantity: updatedVariant.stock_quantity,
    isActive: updatedVariant.is_active,
    createdAt: updatedVariant.created_at.toISOString(),
    updatedAt: updatedVariant.updated_at.toISOString(),
    deletedAt: updatedVariant.deleted_at?.toISOString() ?? null,
  };
}
