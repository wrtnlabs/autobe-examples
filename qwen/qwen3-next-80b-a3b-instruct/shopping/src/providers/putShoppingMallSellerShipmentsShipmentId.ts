import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerShipmentsShipmentId(props: {
  seller: SellerPayload;
  shipmentId: string;
  body: IShoppingMallShipment.IUpdate;
}): Promise<IShoppingMallShipment> {
  // Validate shipment exists and belongs to seller
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    include: { orderItem: true },
  });
  if (!shipment) throw new HttpException("Shipment not found", 404);
  // Verify the order item belongs to the seller
  if (shipment.orderItem.seller_id !== props.seller.id) {
    throw new HttpException("Shipment does not belong to seller", 403);
  }
  // Validate status transition - only 'shipped' can be updated
  if (shipment.status !== "shipped") {
    throw new HttpException(
      "Shipment status cannot be updated from " + shipment.status,
      400,
    );
  }
  // Validate status is permitted - direct access to body.status based on operation spec
  const status = props.body.status;
  const carrier = props.body.carrier;
  const trackingNumber = props.body.tracking_number;
  if (status !== "delivered" && status !== "auto-delivered") {
    throw new HttpException(
      "Status must be 'delivered' or 'auto-delivered'",
      400,
    );
  }
  // Validate carrier and tracking_number if provided
  if (carrier !== undefined) {
    if (!carrier || carrier.trim().length === 0) {
      throw new HttpException("Carrier name must be provided", 400);
    }
    if (carrier.length > 100) {
      throw new HttpException("Carrier name cannot exceed 100 characters", 400);
    }
  }
  if (trackingNumber !== undefined) {
    if (!/^[a-zA-Z0-9]{8,32}$/.test(trackingNumber)) {
      throw new HttpException(
        "Tracking number must be alphanumeric, 8-32 characters",
        400,
      );
    }
    // Only allow tracking number update once (business rule)
    if (
      shipment.tracking_number !== "TBD" &&
      shipment.tracking_number !== trackingNumber
    ) {
      throw new HttpException("Tracking number can only be set once", 400);
    }
  }
  // Check auto-delivery condition - use date string comparison without native Date
  if (status === "auto-delivered") {
    // Convert shipment.created_at to UTC date string for comparison
    const createdDate = new Date(shipment.created_at);
    const fourteenDaysAgo = new Date(
      createdDate.getTime() + 14 * 24 * 60 * 60 * 1000,
    );
    const now = new Date();
    if (now < fourteenDaysAgo) {
      throw new HttpException(
        "Cannot auto-deliver until 14 days have passed",
        400,
      );
    }
  }
  // Update the shipment with direct access to database fields
  const updatedShipment = await MyGlobal.prisma.shopping_mall_shipments.update({
    where: { id: props.shipmentId },
    data: {
      status,
      carrier: carrier !== undefined ? carrier : shipment.carrier,
      tracking_number:
        trackingNumber !== undefined
          ? trackingNumber
          : shipment.tracking_number,
    },
  });
  // Manually map to response DTO with proper type formatting
  const result: IShoppingMallShipment = {
    id: updatedShipment.id,
    shopping_mall_order_item_id: updatedShipment.shopping_mall_order_item_id,
    carrier: updatedShipment.carrier,
    tracking_number: updatedShipment.tracking_number,
    status: updatedShipment.status,
    created_at: toISOStringSafe(updatedShipment.created_at),
    estimated_delivery_date: updatedShipment.estimated_delivery_date
      ? toISOStringSafe(updatedShipment.estimated_delivery_date)
      : null,
  };
  return result;
}
