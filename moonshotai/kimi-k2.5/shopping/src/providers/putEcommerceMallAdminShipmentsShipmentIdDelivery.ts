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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallShipmentDeliveryTransformer } from "../transformers/EcommerceMallShipmentDeliveryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminShipmentsShipmentIdDelivery(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipmentDelivery> {
  // Check shipment exists
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: { id: true },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  // Check if already delivered
  const existingDelivery =
    await MyGlobal.prisma.ecommerce_mall_shipment_deliveries.findUnique({
      where: { shipment_id: props.shipmentId },
      select: { id: true },
    });
  if (existingDelivery) {
    throw new HttpException("Shipment already delivered", 409);
  }
  const now = new Date();
  // Execute transaction: create delivery + update order items
  const delivery = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create delivery record (admin confirmation - customer_id is null)
    const created = await tx.ecommerce_mall_shipment_deliveries.create({
      data: {
        id: v4(),
        shipment_id: props.shipmentId,
        customer_id: null,
        delivered_at: now,
        is_auto_delivered: false,
        created_at: now,
        updated_at: now,
      },
      ...EcommerceMallShipmentDeliveryTransformer.select(),
    });
    // Get all order items in this shipment
    const shipmentItems = await tx.ecommerce_mall_shipment_items.findMany({
      where: { shipment_id: props.shipmentId },
      select: { order_item_id: true },
    });
    const orderItemIds = shipmentItems.map((si) => si.order_item_id);
    // Update all order items to delivered status
    if (orderItemIds.length > 0) {
      await tx.ecommerce_mall_order_items.updateMany({
        where: { id: { in: orderItemIds } },
        data: {
          status: "delivered",
          updated_at: now,
        },
      });
    }
    return created;
  });
  return await EcommerceMallShipmentDeliveryTransformer.transform(delivery);
}
