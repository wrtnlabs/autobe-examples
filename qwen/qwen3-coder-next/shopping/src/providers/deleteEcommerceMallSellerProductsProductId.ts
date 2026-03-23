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
  productId: string;
}): Promise<void> {
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      product_id: props.productId,
      item_status: { in: ["paid", "shipped"] },
    },
  });
  if (orderItems.length > 0) {
    throw new HttpException(
      `Cannot delete: ${orderItems.length} order items are pending`,
      400,
    );
  }
  const pendingCancellations =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where: {
        order_item_id: { in: orderItems.map((i) => i.id) },
        status: "pending",
      },
    });
  if (pendingCancellations.length > 0) {
    throw new HttpException(
      `Cannot delete: ${pendingCancellations.length} pending cancellations`,
      400,
    );
  }
  const pendingRefunds =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
      where: {
        order_item_id: { in: orderItems.map((i) => i.id) },
        status: "pending",
      },
    });
  if (pendingRefunds.length > 0) {
    throw new HttpException(
      `Cannot delete: ${pendingRefunds.length} pending refunds`,
      400,
    );
  }
  await MyGlobal.prisma.ecommerce_mall_products.update({
    where: { id: props.productId },
    data: { deleted_at: new Date() },
  });
}
