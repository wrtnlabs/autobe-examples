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
import { EcommerceMallShipmentDeliveryCollector } from "../collectors/EcommerceMallShipmentDeliveryCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShipmentDeliveryTransformer } from "../transformers/EcommerceMallShipmentDeliveryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerShipmentsShipmentIdDeliveries(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipmentDelivery.ICreate;
}): Promise<IEcommerceMallShipmentDelivery> {
  // Verify shipment exists and get order_id
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findFirst({
    where: { id: props.shipmentId },
    select: {
      id: true,
      order_id: true,
    },
  });
  if (shipment === null) {
    throw new HttpException("Shipment not found", 404);
  }
  // Authorization: verify customer owns the order
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirst({
    where: {
      id: shipment.order_id,
      customer_id: props.customer.id,
    },
    select: {
      id: true,
    },
  });
  if (order === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if shipment already has a delivery record
  const existingDelivery =
    await MyGlobal.prisma.ecommerce_mall_shipment_deliveries.findUnique({
      where: { shipment_id: props.shipmentId },
      ...EcommerceMallShipmentDeliveryTransformer.select(),
    });
  if (existingDelivery !== null) {
    // Idempotent: return existing delivery record
    return await EcommerceMallShipmentDeliveryTransformer.transform(
      existingDelivery,
    );
  }
  // Create delivery record using Collector
  const delivery =
    await MyGlobal.prisma.ecommerce_mall_shipment_deliveries.create({
      data: await EcommerceMallShipmentDeliveryCollector.collect({
        body: props.body,
        shipment: { id: props.shipmentId },
        customer: { id: props.customer.id },
      }),
      ...EcommerceMallShipmentDeliveryTransformer.select(),
    });
  // Update all order items linked to this shipment via shipment_items to 'delivered'
  await MyGlobal.prisma.ecommerce_mall_order_items.updateMany({
    where: {
      shipmentItem: {
        shipment_id: props.shipmentId,
      },
    },
    data: {
      status: "delivered",
      updated_at: new Date(),
    },
  });
  return await EcommerceMallShipmentDeliveryTransformer.transform(delivery);
}
