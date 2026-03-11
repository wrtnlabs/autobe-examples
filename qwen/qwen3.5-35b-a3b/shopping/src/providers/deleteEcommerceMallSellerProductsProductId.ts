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

export async function deleteEcommerceMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: { ecommerce_mall_product_id: props.productId },
  });
  if (orderItems.length > 0) {
    const pendingOrders = orderItems.filter(
      (oi) => oi.item_status === "paid" || oi.item_status === "shipped",
    );
    if (pendingOrders.length > 0) {
      throw new HttpException(
        "Cannot delete product with pending paid or shipped orders",
        409,
      );
    }
  }
  const orderItemIds = orderItems.map((oi) => oi.id);
  if (orderItemIds.length > 0) {
    const cancellationRequests =
      await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
        where: {
          order_item_id: { in: orderItemIds },
          request_status: "pending",
        },
      });
    if (cancellationRequests.length > 0) {
      throw new HttpException(
        "Cannot delete product with pending cancellation requests",
        409,
      );
    }
    const refundRequests =
      await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
        where: {
          order_item_id: { in: orderItemIds },
          request_status: "pending",
        },
      });
    if (refundRequests.length > 0) {
      throw new HttpException(
        "Cannot delete product with pending refund requests",
        409,
      );
    }
  }
  const variants =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: { product_id: props.productId },
      select: { id: true },
    });
  const variantIds = variants.map((v) => v.id);
  await MyGlobal.prisma.ecommerce_mall_wishlists.deleteMany({
    where: { ecommerce_mall_product_id: props.productId },
  });
  await MyGlobal.prisma.ecommerce_mall_inventory_records.deleteMany({
    where: { variant_id: { in: variantIds } },
  });
  await MyGlobal.prisma.ecommerce_mall_product_variants.deleteMany({
    where: { product_id: props.productId },
  });
  await MyGlobal.prisma.ecommerce_mall_products.update({
    where: { id: props.productId },
    data: { deleted_at: new Date() },
  });
}
