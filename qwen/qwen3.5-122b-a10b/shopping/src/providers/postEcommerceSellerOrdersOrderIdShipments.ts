import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEcommerceShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceShipmentCollector } from "../collectors/EcommerceShipmentCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceShipmentTransformer } from "../transformers/EcommerceShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceSellerOrdersOrderIdShipments(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceShipment.ICreate;
}): Promise<IEcommerceShipment> {
  const order = await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: { id: props.orderId },
  });
  const sellerOrderItems = await MyGlobal.prisma.ecommerce_order_items.findMany(
    {
      where: {
        ecommerce_order_id: props.orderId,
        ecommerce_seller_id: props.seller.id,
        deleted_at: null,
      },
    },
  );
  const validOrderItemIds = new Set(sellerOrderItems.map((item) => item.id));
  const invalidItemIds: string[] = [];
  const alreadyShippedItemIds: string[] = [];
  for (const orderItemId of props.body.order_item_ids) {
    if (!validOrderItemIds.has(orderItemId)) {
      const item = await MyGlobal.prisma.ecommerce_order_items.findUnique({
        where: { id: orderItemId },
        select: { ecommerce_seller_id: true, status: true },
      });
      if (item === null) {
        invalidItemIds.push(orderItemId);
      } else if (item.ecommerce_seller_id !== props.seller.id) {
        throw new HttpException("Forbidden", 403);
      } else if (item.status !== "paid") {
        alreadyShippedItemIds.push(orderItemId);
      }
    } else {
      const item = sellerOrderItems.find((i) => i.id === orderItemId);
      if (item && item.status !== "paid") {
        alreadyShippedItemIds.push(orderItemId);
      }
    }
  }
  if (invalidItemIds.length > 0) {
    throw new HttpException("Invalid order item IDs", 400);
  }
  if (alreadyShippedItemIds.length > 0) {
    throw new HttpException("Order items already shipped", 409);
  }
  if (props.body.order_item_ids.length === 0) {
    throw new HttpException("At least one order item must be provided", 400);
  }
  const shipment = await MyGlobal.prisma.$transaction(async (tx) => {
    const shipmentData = await EcommerceShipmentCollector.collect({
      body: props.body,
      order: { id: props.orderId },
      seller: { id: props.seller.id },
    });
    const createdShipment = await tx.ecommerce_shipments.create({
      data: shipmentData,
    });
    await tx.ecommerce_order_items.updateMany({
      where: {
        id: {
          in: props.body.order_item_ids,
        },
      },
      data: {
        status: "shipped",
        updated_at: new Date(),
      },
    });
    const remainingItems = await tx.ecommerce_order_items.findMany({
      where: {
        ecommerce_order_id: props.orderId,
        deleted_at: null,
      },
      select: { status: true },
    });
    const statuses = remainingItems.map((item) => item.status);
    const allDelivered = statuses.every((s) => s === "delivered");
    const allCancelled = statuses.every((s) => s === "cancelled");
    const allRefunded = statuses.every((s) => s === "refunded");
    const anyShipped = statuses.some((s) => s === "shipped");
    const anyPaid = statuses.some((s) => s === "paid");
    let newOrderStatus: string = order.status;
    if (allDelivered) {
      newOrderStatus = "delivered";
    } else if (allCancelled) {
      newOrderStatus = "cancelled";
    } else if (allRefunded) {
      newOrderStatus = "refunded";
    } else if (anyShipped) {
      newOrderStatus = "shipped";
    } else if (anyPaid) {
      newOrderStatus = "paid";
    } else {
      newOrderStatus = "partially_completed";
    }
    await tx.ecommerce_orders.update({
      where: { id: props.orderId },
      data: {
        status: newOrderStatus,
        updated_at: new Date(),
      },
    });
    return createdShipment;
  });
  const shipmentPayload =
    await MyGlobal.prisma.ecommerce_shipments.findUniqueOrThrow({
      where: { id: shipment.id },
      ...EcommerceShipmentTransformer.select(),
    });
  return await EcommerceShipmentTransformer.transform(shipmentPayload);
}
