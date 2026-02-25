import { IEcommerceDeliveryConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDeliveryConfirmation";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceDeliveryConfirmationCollector } from "../collectors/EcommerceDeliveryConfirmationCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceShipmentTransformer } from "../transformers/EcommerceShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerShipmentsShipmentIdDeliveryConfirmations(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceDeliveryConfirmation.ICreate;
}): Promise<IEcommerceShipment> {
  // Validate shipment exists and belongs to customer
  const shipment = await MyGlobal.prisma.ecommerce_shipments.findUniqueOrThrow({
    where: { id: props.shipmentId },
    select: {
      id: true,
      shipment_status: true,
      created_at: true,
      delivered_at: true,
    },
  });
  // Check if shipment belongs to customer via order items
  const orderItemCount = await MyGlobal.prisma.ecommerce_shipment_items.count({
    where: {
      ecommerce_shipment_id: props.shipmentId,
      orderItem: {
        order: {
          customer_id: props.customer.id,
        },
      },
    },
  });
  if (orderItemCount === 0) {
    throw new HttpException("Shipment not found or access denied", 404);
  }
  // Validate shipment status
  if (shipment.shipment_status !== "shipped") {
    throw new HttpException(
      "Shipment must be in 'shipped' status to confirm delivery",
      400,
    );
  }
  if (shipment.delivered_at !== null) {
    throw new HttpException("Shipment has already been delivered", 400);
  }
  // Check manual confirmation time limit (14 days)
  const shipmentCreatedAt = new Date(shipment.created_at);
  const now = new Date();
  const shipmentAgeMs = now.getTime() - shipmentCreatedAt.getTime();
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  if (shipmentAgeMs > fourteenDaysMs) {
    throw new HttpException(
      "Manual delivery confirmation is only allowed within 14 days of shipment creation",
      400,
    );
  }
  // Create delivery confirmation record
  await MyGlobal.prisma.ecommerce_delivery_confirmations.create({
    data: await EcommerceDeliveryConfirmationCollector.collect({
      body: props.body,
      shipment: { id: shipment.id },
      customer: { id: props.customer.id },
    }),
  });
  // Update shipment to delivered status
  await MyGlobal.prisma.ecommerce_shipments.update({
    where: { id: props.shipmentId },
    data: {
      shipment_status: "delivered",
      delivered_at: now,
      updated_at: now,
    },
  });
  // Update all order items in shipment to delivered status
  await MyGlobal.prisma.ecommerce_order_items.updateMany({
    where: {
      shipmentItems: {
        some: {
          ecommerce_shipment_id: props.shipmentId,
        },
      },
    },
    data: {
      status: "delivered",
    },
  });
  // Return updated shipment
  const updatedShipment =
    await MyGlobal.prisma.ecommerce_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...EcommerceShipmentTransformer.select(),
    });
  return await EcommerceShipmentTransformer.transform(updatedShipment);
}
