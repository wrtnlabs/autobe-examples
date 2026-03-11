import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
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
import { EcommerceMallRefundRequestTransformer } from "../transformers/EcommerceMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerOrdersOrderIdItemsOrderItemIdRefundApprove(props: {
  seller: SellerPayload;
  orderId: string;
  orderItemId: string;
}): Promise<IEcommerceMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        order_item_id: true,
        customer_id: true,
        seller_id: true,
        reason: true,
        status: true,
        responded_at: true,
        created_at: true,
        updated_at: true,
      },
    });
  if (refundRequest.status !== "pending") {
    throw new HttpException("Refund request is not in pending status", 400);
  }
  if (refundRequest.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: { id: true, item_status: true, variant_id: true },
    });
  if (orderItem.item_status !== "delivered") {
    throw new HttpException(
      "Refund can only be requested for delivered items",
      400,
    );
  }
  const now = new Date();
  const updatedRefundRequest = await MyGlobal.prisma.$transaction(
    async (prisma) => {
      const updated = await prisma.ecommerce_mall_refund_requests.update({
        where: { id: refundRequest.id },
        data: {
          status: "approved",
          responded_at: now,
        },
      });
      await prisma.ecommerce_mall_refund_request_snapshots.create({
        data: {
          id: v4(),
          refund_request_id: refundRequest.id,
          reason: refundRequest.reason,
          status: refundRequest.status,
          created_at: refundRequest.created_at,
          updated_at: refundRequest.updated_at,
          snapshot_type: "refund_approved",
        },
      });
      await prisma.ecommerce_mall_inventory_records.create({
        data: {
          id: v4(),
          variant_id: orderItem.variant_id,
          quantity_change: 1,
          reason: "refund",
          reference_id: refundRequest.id,
          created_at: now,
        },
      });
      await prisma.ecommerce_mall_order_items.update({
        where: { id: props.orderItemId },
        data: {
          item_status: "refunded",
          updated_at: now,
        },
      });
      const orderItems = await prisma.ecommerce_mall_order_items.findMany({
        where: { order_id: props.orderId },
        select: { item_status: true },
      });
      const allRefunded = orderItems.every(
        (item) => item.item_status === "refunded",
      );
      if (allRefunded) {
        await prisma.ecommerce_mall_orders.update({
          where: { id: props.orderId },
          data: {
            order_status: "refunded",
            updated_at: now,
          },
        });
      }
      return updated;
    },
  );
  const fullRecord =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: updatedRefundRequest.id },
      ...EcommerceMallRefundRequestTransformer.select(),
    });
  return await EcommerceMallRefundRequestTransformer.transform(fullRecord);
}
