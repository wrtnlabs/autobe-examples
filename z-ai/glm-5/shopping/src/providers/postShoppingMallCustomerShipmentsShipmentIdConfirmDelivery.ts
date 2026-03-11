import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallShipmentTransformer } from "../transformers/ShoppingMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerShipmentsShipmentIdConfirmDelivery(props: {
  customer: CustomerPayload;
  shipmentId: string;
}): Promise<IShoppingMallShipment> {
  // 1. Fetch shipment with order to check ownership
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: {
      id: true,
      order_id: true,
      shipped_at: true,
      delivered_at: true,
      order: {
        select: {
          shopping_mall_customer_id: true,
        },
      },
    },
  });
  if (shipment === null) {
    throw new HttpException("Shipment not found", 404);
  }
  // 2. Authorization check - only customer who placed the order can confirm
  if (shipment.order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Business validation
  if (shipment.shipped_at === null) {
    throw new HttpException("Shipment has not been shipped yet", 400);
  }
  if (shipment.delivered_at !== null) {
    throw new HttpException("Delivery already confirmed", 400);
  }
  // Check if 14 days passed (auto-confirmed scenario)
  const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000;
  const shippedTime = shipment.shipped_at.getTime();
  const currentTime = Date.now();
  if (currentTime - shippedTime >= fourteenDaysInMs) {
    throw new HttpException(
      "Shipment already auto-confirmed after 14 days",
      400,
    );
  }
  const now = new Date();
  // 4. Update shipment delivered_at
  await MyGlobal.prisma.shopping_mall_shipments.update({
    where: { id: props.shipmentId },
    data: {
      delivered_at: now,
      updated_at: now,
    },
  });
  // 5. Update all order items in this shipment to 'delivered'
  await MyGlobal.prisma.shopping_mall_order_items.updateMany({
    where: { shopping_mall_shipment_id: props.shipmentId },
    data: {
      status: "delivered",
      updated_at: now,
    },
  });
  // 6. Recalculate order status based on all items
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: { shopping_mall_order_id: shipment.order_id },
    select: { status: true },
  });
  const statusSet = new Set(orderItems.map((item) => item.status));
  const hasPaid = statusSet.has("paid");
  const hasShipped = statusSet.has("shipped");
  const hasDelivered = statusSet.has("delivered");
  const hasCancelled = statusSet.has("cancelled");
  const hasRefunded = statusSet.has("refunded");
  let orderStatus: string;
  if (hasPaid) {
    orderStatus = "paid";
  } else if (hasShipped) {
    if (hasDelivered || hasCancelled || hasRefunded) {
      orderStatus = "partially_completed";
    } else {
      orderStatus = "shipped";
    }
  } else if (hasDelivered) {
    if (hasCancelled || hasRefunded) {
      orderStatus = "partially_completed";
    } else {
      orderStatus = "delivered";
    }
  } else if (hasCancelled && !hasRefunded && !hasDelivered) {
    orderStatus = "cancelled";
  } else if (hasRefunded && !hasCancelled && !hasDelivered) {
    orderStatus = "refunded";
  } else {
    orderStatus = "partially_completed";
  }
  await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: shipment.order_id },
    data: {
      status: orderStatus,
      updated_at: now,
    },
  });
  // 7. Return updated shipment using transformer
  const updated =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...ShoppingMallShipmentTransformer.select(),
    });
  return await ShoppingMallShipmentTransformer.transform(updated);
}
