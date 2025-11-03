import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerShipmentTrackingsId(props: {
  seller: SellerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, id } = props;

  // Fetch shipment tracking with related order
  const shipmentTracking =
    await MyGlobal.prisma.shopping_mall_shipment_trackings.findUnique({
      where: { id },
      include: {
        order: true,
      },
    });

  if (!shipmentTracking) {
    throw new HttpException("Shipment tracking record not found", 404);
  }

  // Check if the seller owns the order
  if (shipmentTracking.order.shopping_mall_customer_id !== seller.id) {
    throw new HttpException(
      "Unauthorized to delete this shipment tracking",
      403,
    );
  }

  // Perform hard delete as no soft delete field exists
  await MyGlobal.prisma.shopping_mall_shipment_trackings.delete({
    where: { id },
  });
}
