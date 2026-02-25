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

export async function postEcommerceCustomerShipmentsShipmentIdDeliveryConfirm(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IEcommerceDeliveryConfirmation> {
  // First validate the shipment exists and has correct status
  const shipment = await MyGlobal.prisma.ecommerce_shipments.findUniqueOrThrow({
    where: { id: props.shipmentId },
    select: { shipment_status: true },
  });
  if (shipment.shipment_status === "delivered") {
    throw new HttpException("Shipment already delivered", 409);
  }
  if (shipment.shipment_status !== "shipped") {
    throw new HttpException(
      "Shipment must be shipped before delivery confirmation",
      400,
    );
  }
  // Validate customer owns order items in this shipment
  const customerOrderItems =
    await MyGlobal.prisma.ecommerce_shipment_items.count({
      where: {
        shipment: { id: props.shipmentId },
        orderItem: {
          order: {
            customer_id: props.customer.id,
          },
        },
      },
    });
  if (customerOrderItems === 0) {
    throw new HttpException(
      "No order items found in this shipment that belong to customer",
      403,
    );
  }
  // Check if delivery confirmation already exists
  const existingConfirmation =
    await MyGlobal.prisma.ecommerce_delivery_confirmations.findFirst({
      where: { ecommerce_shipment_id: props.shipmentId },
    });
  if (existingConfirmation) {
    throw new HttpException(
      "Delivery already confirmed for this shipment",
      409,
    );
  }
  const now = new Date();
  const nowISO = toISOStringSafe(now) as string & tags.Format<"date-time">;
  // Execute all operations in a transaction
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update shipment status and delivered_at
    await tx.ecommerce_shipments.update({
      where: { id: props.shipmentId },
      data: {
        shipment_status: "delivered",
        delivered_at: now,
        updated_at: now,
      },
    });
    // Update all order items in the shipment to 'delivered' status
    await tx.ecommerce_order_items.updateMany({
      where: {
        shipmentItems: {
          some: { ecommerce_shipment_id: props.shipmentId },
        },
      },
      data: { status: "delivered" },
    });
    // Create delivery confirmation
    const confirmationId = v4() as string & tags.Format<"uuid">;
    const confirmation = await tx.ecommerce_delivery_confirmations.create({
      data: {
        id: confirmationId,
        ecommerce_shipment_id: props.shipmentId,
        ecommerce_customer_id: props.customer.id,
        confirmed_at: now,
        created_at: now,
        updated_at: now,
      },
      ...EcommerceDeliveryConfirmationTransformer.select(),
    });
    return confirmation;
  });
  return await EcommerceDeliveryConfirmationTransformer.transform(result);
}
