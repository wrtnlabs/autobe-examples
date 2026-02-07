import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string;
  variantId: string;
}): Promise<void> {
  // Verify product and variant relationship
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
    });
  if (!variant) {
    throw new HttpException(
      "Variant not found or does not belong to this product",
      404,
    );
  }
  // Verify seller owns the product
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product || product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Product not found or access denied", 403);
  }
  // Check for pending order items referencing this variant
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      shopping_mall_product_variant_id: props.variantId,
      deleted_at: null,
    },
  });
  if (orderItems) {
    throw new HttpException(
      "Cannot delete variant with existing order items",
      409,
    );
  }
  // Check for pending cancellation or refund requests
  const hasCancellation =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
      where: {
        shopping_mall_order_item_id: props.variantId,
      },
    });
  const hasRefund =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      where: {
        shopping_mall_order_item_id: props.variantId,
      },
    });
  if (hasCancellation || hasRefund) {
    throw new HttpException(
      "Cannot delete variant with pending cancellation or refund requests",
      409,
    );
  }
  // Check if product will have at least one variant remaining
  const remainingVariants =
    await MyGlobal.prisma.shopping_mall_product_variants.count({
      where: {
        shopping_mall_product_id: props.productId,
        id: { not: props.variantId },
        deleted_at: null,
      },
    });
  if (remainingVariants === 0) {
    throw new HttpException(
      "Product must have at least one variant remaining",
      409,
    );
  }
  // Create product snapshot preserving state before deletion
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_product_id: props.productId,
      created_at: toISOStringSafe(new Date()),
      edited_by_id: props.seller.id,
      name: product.name,
      description: product.description || "",
      category_id: product.shopping_mall_subcategory_id ?? "",
      base_price: product.base_price,
      stock_quantity: remainingVariants,
      published: true,
    },
  });
  // Soft-delete the variant
  await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
