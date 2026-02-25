import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceDeliveryConfirmationTransformer } from "../transformers/EcommerceDeliveryConfirmationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postEcommerceCustomerShipmentsShipmentIdDeliveryConfirmations(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IEcommerceDeliveryConfirmation> {
  // First, validate shipment exists and belongs to customer's order
  const shipment = await MyGlobal.prisma.ecommerce_shipments.findUniqueOrThrow({
    where: { id: props.shipmentId },
    include: {
      shipmentItems: {
        include: {
          orderItem: {
            include: {
              order: {
                select: { customer_id: true },
              },
            },
          },
        },
      },
    },
  });
  // Verify customer owns the order containing this shipment
  if (shipment.shipmentItems.length === 0) {
    throw new HttpException("Shipment has no items", 400);
  }
  const orderCustomerId = shipment.shipmentItems[0].orderItem.order.customer_id;
  if (orderCustomerId !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if shipment is already delivered
  const existingConfirmation =
    await MyGlobal.prisma.ecommerce_delivery_confirmations.findUnique({
      where: { ecommerce_shipment_id: props.shipmentId },
    });
  if (existingConfirmation) {
    throw new HttpException("Delivery already confirmed", 409);
  }
  // Verify shipment is in 'shipped' status
  if (shipment.shipment_status !== "shipped") {
    throw new HttpException(
      "Shipment must be shipped before delivery confirmation",
      400,
    );
  }
  // Use transaction to atomically create confirmation and update order items
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date();
    // Create delivery confirmation
    const confirmation = await tx.ecommerce_delivery_confirmations.create({
      data: {
        id: v4(),
        ecommerce_shipment_id: props.shipmentId,
        ecommerce_customer_id: props.customer.id,
        confirmed_at: now,
        created_at: now,
        updated_at: now,
      },
      ...EcommerceDeliveryConfirmationTransformer.select(),
    });
    // Update all order items in this shipment to 'delivered' status
    const orderItemIds = shipment.shipmentItems.map(
      (item) => item.ecommerce_order_item_id,
    );
    await tx.ecommerce_order_items.updateMany({
      where: {
        id: { in: orderItemIds },
      },
      data: {
        status: "delivered",
      },
    });
    // Update shipment status to 'delivered'
    await tx.ecommerce_shipments.update({
      where: { id: props.shipmentId },
      data: {
        shipment_status: "delivered",
        delivered_at: now,
        updated_at: now,
      },
    });
    return await EcommerceDeliveryConfirmationTransformer.transform(
      confirmation,
    );
  });
}
