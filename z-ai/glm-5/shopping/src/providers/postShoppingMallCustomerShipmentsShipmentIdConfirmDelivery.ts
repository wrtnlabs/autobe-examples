import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderShipmentTransformer } from "../transformers/ShoppingMallOrderShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerShipmentsShipmentIdConfirmDelivery(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderShipment> {
  // Find shipment with ownership verification chain
  const shipment =
    await MyGlobal.prisma.shopping_mall_order_shipments.findUnique({
      where: { id: props.shipmentId },
      select: {
        id: true,
        delivered_at: true,
        deleted_at: true,
        items: {
          select: {
            orderItem: {
              select: {
                id: true,
                order: {
                  select: { shopping_mall_customer_id: true },
                },
              },
            },
          },
        },
      },
    });
  // Shipment not found or deleted
  if (shipment === null || shipment.deleted_at !== null) {
    throw new HttpException("Shipment not found", 404);
  }
  // Already delivered
  if (shipment.delivered_at !== null) {
    throw new HttpException(
      "Shipment has already been confirmed as delivered",
      400,
    );
  }
  // Verify ownership - all items should belong to same customer
  const customerIds = new Set(
    shipment.items.map(
      (item) => item.orderItem.order.shopping_mall_customer_id,
    ),
  );
  if (customerIds.size !== 1 || !customerIds.has(props.customer.id)) {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date();
  // Update shipment with delivery confirmation
  await MyGlobal.prisma.shopping_mall_order_shipments.update({
    where: { id: props.shipmentId },
    data: {
      delivered_at: now,
      delivery_confirmation_method: "manual",
      updated_at: now,
    },
  });
  // Update all order items to delivered status
  const orderItemIds = shipment.items.map((item) => item.orderItem.id);
  await MyGlobal.prisma.shopping_mall_order_items.updateMany({
    where: { id: { in: orderItemIds } },
    data: { status: "delivered" },
  });
  // Fetch and return updated shipment using transformer
  const updated =
    await MyGlobal.prisma.shopping_mall_order_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...ShoppingMallOrderShipmentTransformer.select(),
    });
  return await ShoppingMallOrderShipmentTransformer.transform(updated);
}
