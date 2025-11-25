import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipmentTrackingHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingHistory";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerShipmentsShipmentIdTrackingHistories(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentTrackingHistory.ICreate;
}): Promise<IShoppingMallShipmentTrackingHistory> {
  // Step 1: Fetch the shipment (must exist)
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findFirst({
    where: { id: props.shipmentId },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }

  // Step 2: Fetch the parent order using order_id from shipment
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: { id: shipment.order_id },
    select: { shopping_mall_customer_id: true },
  });
  if (!order || order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Shipment not found or access denied", 404);
  }

  // Step 3: Insert new tracking event
  const created =
    await MyGlobal.prisma.shopping_mall_shipment_tracking_histories.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shipment_id: props.shipmentId,
        event_time: props.body.event_time,
        location: props.body.location == null ? null : props.body.location,
        latitude: props.body.latitude == null ? null : props.body.latitude,
        longitude: props.body.longitude == null ? null : props.body.longitude,
        event_code:
          props.body.event_code == null ? null : props.body.event_code,
        status: props.body.status,
        tracking_message: props.body.tracking_message,
        created_at: toISOStringSafe(new Date()),
      },
    });

  // Step 4: Map to DTO, carefully handling optional/null fields
  return {
    id: created.id,
    shipment_id: created.shipment_id,
    event_time: toISOStringSafe(created.event_time),
    location: created.location != null ? created.location : undefined,
    latitude: created.latitude != null ? created.latitude : undefined,
    longitude: created.longitude != null ? created.longitude : undefined,
    event_code: created.event_code != null ? created.event_code : undefined,
    status: created.status,
    tracking_message: created.tracking_message,
    created_at: toISOStringSafe(created.created_at),
  };
}
