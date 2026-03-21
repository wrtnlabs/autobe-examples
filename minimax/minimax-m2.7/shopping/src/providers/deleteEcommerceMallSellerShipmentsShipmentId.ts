import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteEcommerceMallSellerShipmentsShipmentId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Retrieve the shipment with ownership and item status information
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: {
      id: true,
      ecommerce_mall_seller_id: true,
      deleted_at: true,
      shipmentItems: {
        select: {
          orderItem: {
            select: {
              status: true,
            },
          },
        },
      },
    },
  });
  // 2. Check if shipment exists (404 for both not found and already deleted)
  if (!shipment || shipment.deleted_at !== null) {
    throw new HttpException("Shipment not found", 404);
  }
  // 3. Verify the seller owns this shipment
  if (shipment.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Check if any items have been delivered (cannot delete after delivery)
  const hasDeliveredItems = shipment.shipmentItems.some(
    (item) => item.orderItem.status === "delivered",
  );
  if (hasDeliveredItems) {
    throw new HttpException(
      "Cannot delete shipment after delivery confirmation",
      400,
    );
  }
  // 5. Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.ecommerce_mall_shipments.update({
    where: { id: props.shipmentId },
    data: {
      deleted_at: new Date(),
    },
  });
}
