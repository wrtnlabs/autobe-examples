import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantTransformer } from "../transformers/ShoppingMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string;
  variantId: string;
  body: IShoppingMallProductVariant.IUpdate;
}): Promise<IShoppingMallProductVariant> {
  // Find the variant by ID and ensure it belongs to the requested product
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        product_id: true,
        sku_code: true,
        price: true,
        stock_quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Verify seller owns this variant (via product ownership)
  if (variant.product_id !== props.productId) {
    throw new HttpException("Variant does not belong to product", 404);
  }
  // Validate seller is the owner of the product
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if variant is referenced by any order items in 'paid' or 'shipped' status
  const usedInClosedOrder =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        variant: { id: props.variantId },
        status: { in: ["paid", "shipped"] },
      },
    });
  if (usedInClosedOrder) {
    throw new HttpException(
      "Variant is in use by a paid or shipped order",
      409,
    );
  }
  // Validate SKU uniqueness across all variants
  if (props.body.sku_code !== undefined) {
    const existingWithSameSku =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
        where: {
          sku_code: props.body.sku_code,
          id: { not: props.variantId },
        },
      });
    if (existingWithSameSku) {
      throw new HttpException("SKU code already exists", 400);
    }
  }
  // If any field is being updated, create a snapshot of the current state
  // Skip options field since it's not in the database schema
  if (props.body.sku_code !== undefined || props.body.price !== undefined) {
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.create({
      data: {
        variant: { connect: { id: props.variantId } },
        sku_code: variant.sku_code,
        price: variant.price,
        changed_by: props.seller.id,
        changed_at: new Date().toISOString(),
      },
    });
  }
  // Calculate update data - only include fields that are specified and non-null
  const updateData: Prisma.shopping_mall_product_variantsUpdateInput = {};
  if (props.body.sku_code !== undefined) {
    updateData.sku_code = props.body.sku_code;
  }
  if (props.body.price !== undefined) {
    updateData.price = props.body.price;
  }
  // Skip options field since it's not in the database schema
  // Apply the update
  const updated = await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: props.variantId },
    data: updateData,
    ...ShoppingMallProductVariantTransformer.select(),
  });
  // Return transformed response
  return await ShoppingMallProductVariantTransformer.transform(updated);
}
