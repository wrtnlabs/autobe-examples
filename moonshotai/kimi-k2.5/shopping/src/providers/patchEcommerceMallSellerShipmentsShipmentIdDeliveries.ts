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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShipmentAtSummaryTransformer } from "../transformers/EcommerceMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerShipmentsShipmentIdDeliveries(props: {
  seller: SellerPayload;
  shipmentId: string;
}): Promise<IEcommerceMallShipment.ISummary> {
  const now = toISOStringSafe(new Date());
  const shipmentId = props.shipmentId as string & tags.Format<"uuid">;
  // Verify shipment exists and belongs to seller
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: shipmentId },
      select: {
        seller_id: true,
        deleted_at: true,
      },
    });
  if (shipment.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (shipment.deleted_at !== null) {
    throw new HttpException("Shipment not found", 404);
  }
  // Check if delivery already exists
  const existingDelivery =
    await MyGlobal.prisma.ecommerce_mall_shipment_deliveries.findUnique({
      where: { shipment_id: shipmentId },
      select: { id: true },
    });
  if (existingDelivery !== null) {
    throw new HttpException("Shipment already delivered", 400);
  }
  // Execute delivery confirmation in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create delivery record - seller-initiated delivery (no customer)
    await tx.ecommerce_mall_shipment_deliveries.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shipment: { connect: { id: shipmentId } },
        delivered_at: now,
        is_auto_delivered: false,
        created_at: now,
        updated_at: now,
      },
    });
    // Find all order items linked to this shipment and update status
    const shipmentItems = await tx.ecommerce_mall_shipment_items.findMany({
      where: { shipment_id: shipmentId },
      select: { order_item_id: true },
    });
    const orderItemIds = shipmentItems.map((si) => si.order_item_id);
    if (orderItemIds.length > 0) {
      await tx.ecommerce_mall_order_items.updateMany({
        where: { id: { in: orderItemIds } },
        data: { status: "Delivered", updated_at: now },
      });
    }
  });
  // Fetch and return the updated shipment using transformer
  const updated =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: shipmentId },
      ...EcommerceMallShipmentAtSummaryTransformer.select(),
    });
  return await EcommerceMallShipmentAtSummaryTransformer.transform(updated);
}
