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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallOrderShipmentTransformer } from "../transformers/ShoppingMallOrderShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminShipmentsShipmentIdForceDelivery(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderShipment.IForceDelivery;
}): Promise<IShoppingMallOrderShipment> {
  // Validate shipment exists and is not already delivered or deleted
  const shipment =
    await MyGlobal.prisma.shopping_mall_order_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        delivered_at: true,
        deleted_at: true,
      },
    });
  if (shipment.delivered_at !== null) {
    throw new HttpException("Shipment already delivered", 409);
  }
  if (shipment.deleted_at !== null) {
    throw new HttpException("Shipment has been deleted", 400);
  }
  const now = new Date();
  // Execute transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update shipment
    await tx.shopping_mall_order_shipments.update({
      where: { id: props.shipmentId },
      data: {
        delivered_at: now,
        delivery_confirmation_method: "admin_override",
        updated_at: now,
      },
    });
    // Create audit log
    await tx.shopping_mall_order_shipment_audit_logs.create({
      data: {
        id: v4(),
        shopping_mall_order_shipment_id: props.shipmentId,
        event_type: "admin_override",
        old_status: "shipped",
        new_status: "delivered",
        actor_type: "admin",
        actor_id: props.admin.id,
        ip: null,
        href: null,
        notes: props.body.notes ?? null,
        created_at: now,
      },
    });
    // Get all order item IDs in this shipment
    const shipmentItems = await tx.shopping_mall_order_shipment_items.findMany({
      where: { shopping_mall_order_shipment_id: props.shipmentId },
      select: { shopping_mall_order_item_id: true },
    });
    const orderItemIds = shipmentItems.map(
      (item) => item.shopping_mall_order_item_id,
    );
    // Batch update all order items to delivered status
    if (orderItemIds.length > 0) {
      await tx.shopping_mall_order_items.updateMany({
        where: { id: { in: orderItemIds } },
        data: { status: "delivered" },
      });
    }
  });
  // Fetch and return updated shipment using transformer
  const updated =
    await MyGlobal.prisma.shopping_mall_order_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...ShoppingMallOrderShipmentTransformer.select(),
    });
  return await ShoppingMallOrderShipmentTransformer.transform(updated);
}
