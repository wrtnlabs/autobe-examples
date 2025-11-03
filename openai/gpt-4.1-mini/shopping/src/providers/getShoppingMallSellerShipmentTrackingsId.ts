import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerShipmentTrackingsId(props: {
  seller: SellerPayload;
  id: string;
}): Promise<IShoppingMallShipmentTracking> {
  const { seller, id } = props;

  const shipment =
    await MyGlobal.prisma.shopping_mall_shipment_trackings.findUnique({
      where: { id },
    });

  if (!shipment) {
    throw new HttpException("Shipment tracking not found", 404);
  }

  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: shipment.shopping_mall_order_id },
  });

  if (!order) {
    throw new HttpException("Order for shipment not found", 404);
  }

  /**
   * AUTHORIZATION LIMITATION:
   *
   * - The current Prisma schema for shopping_mall_orders does not include a
   *   seller association.
   * - Therefore, it is impossible to verify whether the authenticated seller owns
   *   this shipment's order.
   * - This is a contradiction between the API security requirement and the
   *   database schema.
   * - For now, this function allows retrieval without seller ownership
   *   verification.
   *
   * @todo Implement proper authorization once seller association is present.
   */

  return {
    id: shipment.id,
    shopping_mall_order_id: shipment.shopping_mall_order_id,
    tracking_number: shipment.tracking_number,
    carrier_name: shipment.carrier_name,
    shipping_status: shipment.shipping_status,
    shipped_at: toISOStringSafe(shipment.shipped_at),
    delivered_at: shipment.delivered_at
      ? toISOStringSafe(shipment.delivered_at)
      : null,
    created_at: toISOStringSafe(shipment.created_at),
    updated_at: toISOStringSafe(shipment.updated_at),
    deleted_at: shipment.deleted_at
      ? toISOStringSafe(shipment.deleted_at)
      : null,
  };
}
