import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShipmentDeliveryTransformer } from "../transformers/EcommerceMallShipmentDeliveryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallCustomerShipmentsShipmentIdDelivery(props: {
  customer: CustomerPayload;
  shipmentId: string;
}): Promise<IEcommerceMallShipmentDelivery> {
  // Verify shipment exists and belongs to customer's order
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
      deleted_at: null,
    },
    select: {
      id: true,
      order: {
        select: {
          customer_id: true,
        },
      },
    },
  });
  if (shipment === null) {
    throw new HttpException("Shipment not found", 404);
  }
  if (shipment.order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden - you do not own this order", 403);
  }
  // Check if already delivered
  const existingDelivery =
    await MyGlobal.prisma.ecommerce_mall_shipment_deliveries.findUnique({
      where: {
        shipment_id: props.shipmentId,
      },
      select: {
        id: true,
      },
    });
  if (existingDelivery !== null) {
    throw new HttpException("Shipment already delivered", 409);
  }
  // Execute atomic transaction
  const now = new Date();
  const deliveryId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.$transaction([
    // Create delivery record
    MyGlobal.prisma.ecommerce_mall_shipment_deliveries.create({
      data: {
        id: deliveryId,
        shipment_id: props.shipmentId,
        customer_id: props.customer.id,
        delivered_at: now,
        is_auto_delivered: false,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    }),
    // Update all order items in this shipment to delivered
    MyGlobal.prisma.ecommerce_mall_order_items.updateMany({
      where: {
        shipmentItem: {
          is: {
            shipment_id: props.shipmentId,
          },
        },
      },
      data: {
        status: "delivered",
        updated_at: now,
      },
    }),
  ]);
  // Fetch the created delivery with proper selection
  const delivery =
    await MyGlobal.prisma.ecommerce_mall_shipment_deliveries.findUniqueOrThrow({
      where: {
        id: deliveryId,
      },
      ...EcommerceMallShipmentDeliveryTransformer.select(),
    });
  return await EcommerceMallShipmentDeliveryTransformer.transform(delivery);
}
