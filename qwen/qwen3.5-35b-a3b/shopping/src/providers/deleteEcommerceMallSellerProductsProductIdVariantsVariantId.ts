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

export async function deleteEcommerceMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify seller owns the product
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (product === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Verify variant exists and belongs to this product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        product_id: props.productId,
        deleted_at: null,
      },
    });
  if (variant === null) {
    throw new HttpException("Not Found", 404);
  }
  // Step 3: Check for blocking order items (paid or shipped status)
  const blockingOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: {
        ecommerce_mall_product_variant_id: props.variantId,
        item_status: {
          in: ["paid", "shipped"],
        },
      },
      select: { id: true },
    });
  if (blockingOrderItems.length > 0) {
    const blockingIds = blockingOrderItems.map((item) => item.id);
    throw new HttpException(
      `Cannot delete variant with active orders: ${blockingIds.join(", ")}`,
      409,
    );
  }
  // Step 4: Check for pending cancellation requests
  const blockingCancellationRequests =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where: {
        orderItem: {
          ecommerce_mall_product_variant_id: props.variantId,
        },
        request_status: "pending",
      },
      select: { id: true },
    });
  if (blockingCancellationRequests.length > 0) {
    const blockingIds = blockingCancellationRequests.map((req) => req.id);
    throw new HttpException(
      `Cannot delete variant with pending cancellation requests: ${blockingIds.join(", ")}`,
      409,
    );
  }
  // Step 5: Check for pending refund requests
  const blockingRefundRequests =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
      where: {
        orderItem: {
          ecommerce_mall_product_variant_id: props.variantId,
        },
        request_status: "pending",
      },
      select: { id: true },
    });
  if (blockingRefundRequests.length > 0) {
    const blockingIds = blockingRefundRequests.map((req) => req.id);
    throw new HttpException(
      `Cannot delete variant with pending refund requests: ${blockingIds.join(", ")}`,
      409,
    );
  }
  // Step 6: Check if this is the last active variant
  const activeVariantCount =
    await MyGlobal.prisma.ecommerce_mall_product_variants.count({
      where: {
        product_id: props.productId,
        deleted_at: null,
        is_active: true,
      },
    });
  if (activeVariantCount <= 1) {
    throw new HttpException(
      "Cannot delete the last variant of a product. At least one variant must remain for the product to be purchasable.",
      409,
    );
  }
  // Step 7: Soft delete the variant (using ISO string format)
  const deletedAt: string & tags.Format<"date-time"> = new Date().toISOString();
  await MyGlobal.prisma.ecommerce_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      deleted_at: deletedAt,
    },
  });
  // Step 8: Delete current inventory record (most recent)
  const currentInventoryRecord =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findFirst({
      where: {
        variant_id: props.variantId,
      },
      orderBy: { timestamp: "desc" },
    });
  if (currentInventoryRecord !== null) {
    await MyGlobal.prisma.ecommerce_mall_inventory_records.delete({
      where: { id: currentInventoryRecord.id },
    });
  }
}
