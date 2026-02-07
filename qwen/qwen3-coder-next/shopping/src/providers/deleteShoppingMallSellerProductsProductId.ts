import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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

export async function deleteShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string;
}): Promise<IShoppingMallProduct> {
  // Find the product and verify ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or access denied", 404);
  }
  // Find all variants for this product
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
    });
  // Extract variant IDs
  const variantIds = variants.map((v) => v.id);
  // Find order items for these variants
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      shopping_mall_product_variant_id: { in: variantIds },
    },
  });
  // Check for active orders referencing these variants
  const hasActiveOrders =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_product_variant_id: {
          in: variantIds,
        },
        status: { not: "cancelled" },
      },
    });
  if (hasActiveOrders) {
    throw new HttpException("Cannot delete product with active orders", 400);
  }
  // Check for active cancellation requests
  const activeOrderItemIds = orderItems.map((oi) => oi.id);
  const hasCancellationRequests =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
      where: {
        shopping_mall_order_item_id: {
          in: activeOrderItemIds,
        },
        status: "pending",
      },
    });
  if (hasCancellationRequests) {
    throw new HttpException(
      "Cannot delete product with pending cancellations",
      400,
    );
  }
  // Check for active refund requests
  const hasRefundRequests =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      where: {
        shopping_mall_order_item_id: {
          in: activeOrderItemIds,
        },
        status: "pending",
      },
    });
  if (hasRefundRequests) {
    throw new HttpException("Cannot delete product with pending refunds", 400);
  }
  // Perform soft delete on all images - deleted_at not allowed for images
  await MyGlobal.prisma.shopping_mall_product_images.updateMany({
    where: { shopping_mall_product_id: props.productId },
    data: {},
  });
  // Perform soft delete on all variants
  await MyGlobal.prisma.shopping_mall_product_variants.updateMany({
    where: { shopping_mall_product_id: props.productId },
    data: { deleted_at: new Date() },
  });
  // Perform soft delete on the product itself
  const deletedProduct = await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: {
      deleted_at: new Date(),
      status: "deleted",
    },
  });
  // Return the deleted product (as IShoppingMallProduct)
  return {
    id: deletedProduct.id,
    shopping_mall_seller_id: deletedProduct.shopping_mall_seller_id,
    shopping_mall_subcategory_id: deletedProduct.shopping_mall_subcategory_id,
    name: deletedProduct.name,
    description: deletedProduct.description,
    base_price: deletedProduct.base_price,
    status: deletedProduct.status,
    created_at: toISOStringSafe(deletedProduct.created_at),
    updated_at: toISOStringSafe(deletedProduct.updated_at),
    deleted_at: deletedProduct.deleted_at
      ? toISOStringSafe(deletedProduct.deleted_at)
      : null,
  };
}
