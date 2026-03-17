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
import { EcommerceMallShipmentAtSummaryTransformer } from "../transformers/EcommerceMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerShipmentsShipmentIdDeliveries(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipment.ISummary> {
  // Verify customer owns the order for this shipment
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
      deleted_at: null,
      order: {
        customer_id: props.customer.id,
        deleted_at: null,
      },
    },
    select: {
      id: true,
      order_id: true,
    },
  });
  if (shipment === null) {
    throw new HttpException("Shipment not found or access denied", 404);
  }
  // Check if already delivered (delivery record exists)
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
    throw new HttpException("Shipment already delivered", 400);
  }
  // Create delivery confirmation record and update order items in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create delivery confirmation
    await tx.ecommerce_mall_shipment_deliveries.create({
      data: {
        id: v4(),
        shipment_id: props.shipmentId,
        customer_id: props.customer.id,
        delivered_at: new Date(),
        is_auto_delivered: false,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    // Get all order item IDs in this shipment
    const shipmentItems = await tx.ecommerce_mall_shipment_items.findMany({
      where: {
        shipment_id: props.shipmentId,
      },
      select: {
        order_item_id: true,
      },
    });
    const orderItemIds = shipmentItems.map((item) => item.order_item_id);
    // Update all order items to delivered status
    if (orderItemIds.length > 0) {
      await tx.ecommerce_mall_order_items.updateMany({
        where: {
          id: {
            in: orderItemIds,
          },
        },
        data: {
          status: "delivered",
          updated_at: new Date(),
        },
      });
    }
  });
  // Fetch and return the updated shipment with transformer
  const updatedShipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: {
        id: props.shipmentId,
      },
      ...EcommerceMallShipmentAtSummaryTransformer.select(),
    });
  return await EcommerceMallShipmentAtSummaryTransformer.transform(
    updatedShipment,
  );
}
