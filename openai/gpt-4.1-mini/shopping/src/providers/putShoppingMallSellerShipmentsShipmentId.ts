import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerShipmentsShipmentId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IUpdate;
}): Promise<IShoppingMallShipment> {
  const existing = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
  });

  if (!existing) {
    throw new HttpException("Shipment not found", 404);
  }

  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: existing.shopping_mall_order_id },
    select: { shopping_mall_seller_id: true },
  });

  if (!order) {
    throw new HttpException("Order linked to shipment not found", 404);
  }

  if (order.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updateData: Prisma.shopping_mall_shipmentsUpdateInput = {};

  if (
    props.body.shipping_carrier !== null &&
    props.body.shipping_carrier !== undefined
  ) {
    updateData.shipping_carrier = props.body.shipping_carrier;
  }

  if (
    props.body.tracking_number !== null &&
    props.body.tracking_number !== undefined
  ) {
    updateData.tracking_number = props.body.tracking_number;
  }

  if (props.body.status !== null && props.body.status !== undefined) {
    updateData.shipment_status = props.body.status;
  }

  if (props.body.shipped_at !== null && props.body.shipped_at !== undefined) {
    updateData.shipped_at = toISOStringSafe(props.body.shipped_at);
  }

  if (
    props.body.delivered_at !== null &&
    props.body.delivered_at !== undefined
  ) {
    updateData.delivered_at = toISOStringSafe(props.body.delivered_at);
  }

  updateData.updated_at = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_shipments.update({
    where: { id: props.shipmentId },
    data: updateData,
  });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shipping_carrier: updated.shipping_carrier,
    tracking_number: updated.tracking_number,
    status: updated.shipment_status as
      | "pending"
      | "shipped"
      | "in_transit"
      | "delivered"
      | "cancelled",
    shipped_at: updated.shipped_at ? toISOStringSafe(updated.shipped_at) : null,
    delivered_at: updated.delivered_at
      ? toISOStringSafe(updated.delivered_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
