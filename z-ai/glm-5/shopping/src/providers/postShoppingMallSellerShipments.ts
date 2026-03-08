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
import { ShoppingMallShipmentCollector } from "../collectors/ShoppingMallShipmentCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentTransformer } from "../transformers/ShoppingMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerShipments(props: {
  seller: SellerPayload;
  body: IShoppingMallShipment.ICreate;
}): Promise<IShoppingMallShipment> {
  // Fetch all order items by IDs
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      id: { in: props.body.order_item_ids },
    },
    select: {
      id: true,
      shopping_mall_order_id: true,
      shopping_mall_seller_id: true,
      shopping_mall_shipment_id: true,
      status: true,
    },
  });
  // Verify all order items exist
  if (orderItems.length !== props.body.order_item_ids.length) {
    throw new HttpException("One or more order items not found", 404);
  }
  // Verify all belong to authenticated seller
  const notOwnedItems = orderItems.filter(
    (item) => item.shopping_mall_seller_id !== props.seller.id,
  );
  if (notOwnedItems.length > 0) {
    throw new HttpException("You can only ship your own order items", 403);
  }
  // Verify all have 'paid' status
  const notPaidItems = orderItems.filter((item) => item.status !== "paid");
  if (notPaidItems.length > 0) {
    throw new HttpException("All order items must have 'paid' status", 400);
  }
  // Verify none already shipped
  const alreadyShippedItems = orderItems.filter(
    (item) => item.shopping_mall_shipment_id !== null,
  );
  if (alreadyShippedItems.length > 0) {
    throw new HttpException(
      "One or more order items have already been shipped",
      400,
    );
  }
  // Verify all belong to same order
  const orderIds = new Set(
    orderItems.map((item) => item.shopping_mall_order_id),
  );
  if (orderIds.size !== 1) {
    throw new HttpException(
      "All order items must belong to the same order",
      400,
    );
  }
  // Verify order_id matches
  const orderId = orderItems[0].shopping_mall_order_id;
  if (orderId !== props.body.order_id) {
    throw new HttpException(
      "Order items do not belong to the specified order",
      400,
    );
  }
  // Verify order exists
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.body.order_id },
    select: { id: true },
  });
  if (order === null) {
    throw new HttpException("Order not found", 404);
  }
  // Create shipment using collector
  const shipmentData = await ShoppingMallShipmentCollector.collect({
    body: props.body,
    seller: props.seller,
  });
  // Create shipment in database
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.create({
    data: shipmentData,
    ...ShoppingMallShipmentTransformer.select(),
  });
  // Update order items: set shipment_id and status to 'shipped'
  const now = new Date();
  await MyGlobal.prisma.shopping_mall_order_items.updateMany({
    where: { id: { in: props.body.order_item_ids } },
    data: {
      shopping_mall_shipment_id: shipment.id,
      status: "shipped",
      updated_at: now,
    },
  });
  // Fetch all order items for this order to derive status
  const allOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: orderId },
      select: { status: true },
    });
  // Derive order status
  const statuses = allOrderItems.map((item) => item.status);
  const allDelivered = statuses.every((s) => s === "delivered");
  const allCancelled = statuses.every((s) => s === "cancelled");
  const allRefunded = statuses.every((s) => s === "refunded");
  const anyShipped = statuses.some((s) => s === "shipped");
  const allPaid = statuses.every((s) => s === "paid");
  let orderStatus: string;
  if (allDelivered) {
    orderStatus = "delivered";
  } else if (allCancelled) {
    orderStatus = "cancelled";
  } else if (allRefunded) {
    orderStatus = "refunded";
  } else if (anyShipped) {
    orderStatus = "shipped";
  } else if (allPaid) {
    orderStatus = "paid";
  } else {
    orderStatus = "partially_completed";
  }
  // Update order status
  await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: orderId },
    data: {
      status: orderStatus,
      updated_at: now,
    },
  });
  // Transform and return
  return await ShoppingMallShipmentTransformer.transform(shipment);
}
