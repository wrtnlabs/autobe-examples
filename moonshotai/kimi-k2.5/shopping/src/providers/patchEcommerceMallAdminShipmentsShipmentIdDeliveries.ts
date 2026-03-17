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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallShipmentAtSummaryTransformer } from "../transformers/EcommerceMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminShipmentsShipmentIdDeliveries(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipment.ISummary> {
  // Fetch shipment with delivery status and order items
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findUnique({
    where: {
      id: props.shipmentId,
      deleted_at: null,
    },
    select: {
      id: true,
      seller_id: true,
      order_id: true,
      delivery: {
        select: { id: true },
      },
      shipmentItems: {
        select: {
          orderItem: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
    },
  });
  // Verify shipment exists and is not deleted
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  // Verify shipment hasn't been delivered yet
  if (shipment.delivery) {
    throw new HttpException("Shipment has already been delivered", 400);
  }
  // Verify shipment has items to deliver
  if (shipment.shipmentItems.length === 0) {
    throw new HttpException("Shipment contains no items", 400);
  }
  // Verify all order items are in 'shipped' status
  const allItemsShipped = shipment.shipmentItems.every(
    (si) => si.orderItem.status === "shipped",
  );
  if (!allItemsShipped) {
    throw new HttpException(
      "Not all items in shipment are ready for delivery",
      400,
    );
  }
  // Execute delivery confirmation in transaction
  const now = new Date();
  const orderItemIds = shipment.shipmentItems.map((si) => si.orderItem.id);
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create delivery record - admin confirmed (not auto), no customer_id
    await tx.ecommerce_mall_shipment_deliveries.create({
      data: {
        id: v4(),
        shipment_id: props.shipmentId,
        customer_id: null,
        delivered_at: now,
        is_auto_delivered: false,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    // Update all order items in this shipment to delivered status
    await tx.ecommerce_mall_order_items.updateMany({
      where: {
        id: { in: orderItemIds },
        status: "shipped", // Only update items that are shipped
      },
      data: {
        status: "delivered",
        updated_at: now,
      },
    });
  });
  // Fetch updated shipment with full transformer select
  const updatedShipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...EcommerceMallShipmentAtSummaryTransformer.select(),
    });
  return await EcommerceMallShipmentAtSummaryTransformer.transform(
    updatedShipment,
  );
}
