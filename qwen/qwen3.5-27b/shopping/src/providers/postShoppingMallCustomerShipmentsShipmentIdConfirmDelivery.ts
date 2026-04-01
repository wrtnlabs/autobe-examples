import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipment> {
  // Load shipment with order items and their order relations for ownership validation
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        deleted_at: true,
        delivery_confirmed: true,
        shipmentItems: {
          select: {
            orderItem: {
              select: {
                id: true,
                shopping_mall_order_id: true,
                order: {
                  select: {
                    shopping_mall_customer_id: true,
                  },
                },
              },
            },
          },
        } satisfies Prisma.shopping_mall_shipment_itemsFindManyArgs,
      },
    });
  // Check shipment is not soft-deleted
  if (shipment.deleted_at !== null) {
    throw new HttpException("Shipment not found", 404);
  }
  // Check shipment is not already confirmed
  if (shipment.delivery_confirmed === true) {
    throw new HttpException("Delivery already confirmed", 400);
  }
  // Verify all order items belong to orders owned by the authenticated customer
  for (const shipmentItem of shipment.shipmentItems) {
    const orderItemId = shipmentItem.orderItem.id;
    const orderId = shipmentItem.orderItem.shopping_mall_order_id;
    const customerId = shipmentItem.orderItem.order.shopping_mall_customer_id;
    if (customerId !== props.customer.id) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Update shipment with delivery confirmation
  await MyGlobal.prisma.shopping_mall_shipments.update({
    where: { id: props.shipmentId },
    data: {
      delivery_confirmed: true,
      delivered_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Update all order items to 'delivered' status
  const orderItemIds = shipment.shipmentItems.map((si) => si.orderItem.id);
  await MyGlobal.prisma.shopping_mall_order_items.updateMany({
    where: {
      id: { in: orderItemIds },
    },
    data: {
      status: "delivered",
      updated_at: new Date(),
    },
  });
  // Reload shipment with full select for response
  const updatedShipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...ShoppingMallShipmentTransformer.select(),
    });
  return await ShoppingMallShipmentTransformer.transform(updatedShipment);
}
