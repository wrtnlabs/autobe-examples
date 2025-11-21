import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrdersOrderIdShipmentsShipmentId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the order exists
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // Verify shipment exists and belongs to the order
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
  });

  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }

  if (shipment.shopping_mall_order_id !== props.orderId) {
    throw new HttpException(
      "Shipment does not belong to the specified order",
      400,
    );
  }

  // Perform hard delete
  await MyGlobal.prisma.shopping_mall_shipments.delete({
    where: { id: props.shipmentId },
  });
}
