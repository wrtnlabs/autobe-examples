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
  // Find variant with product to verify ownership
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        shopping_mall_product_id: true,
        inventoryHistories: {
          select: { id: true },
        },
      },
    });
  // Verify seller ownership
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { shopping_mall_seller_id: true },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check for paid/shipped order items
  const hasPaidShippedItems =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_order_variant_snapshot_id: props.variantId,
        item_status: { in: ["paid", "shipped"] },
      },
    });
  if (hasPaidShippedItems) {
    throw new HttpException(
      "Cannot delete variant with paid/shipped order items",
      409,
    );
  }
  // Check for pending cancellation requests
  const hasPendingCancellation =
    await MyGlobal.prisma.shopping_mall_order_cancellation_requests.findFirst({
      where: {
        orderItem: {
          shopping_mall_order_variant_snapshot_id: props.variantId,
        },
        status: "pending",
      },
    });
  if (hasPendingCancellation) {
    throw new HttpException(
      "Cannot delete variant with pending cancellation requests",
      409,
    );
  }
  // Check for pending refund requests
  const hasPendingRefund =
    await MyGlobal.prisma.shopping_mall_order_refund_requests.findFirst({
      where: {
        orderItem: {
          shopping_mall_order_variant_snapshot_id: props.variantId,
        },
        status: "pending",
      },
    });
  if (hasPendingRefund) {
    throw new HttpException(
      "Cannot delete variant with pending refund requests",
      409,
    );
  }
  // Delete inventory history records (cascade handles variant relation)
  await MyGlobal.prisma.shopping_mall_inventory_histories.deleteMany({
    where: {
      shopping_mall_product_variant_id: props.variantId,
    },
  });
  // Delete variant record
  await MyGlobal.prisma.shopping_mall_product_variants.delete({
    where: { id: props.variantId },
  });
}
