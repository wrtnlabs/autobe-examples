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

export async function getShoppingMallSellerShipmentsShipmentId(props: {
  seller: SellerPayload;
  shipmentId: string;
}): Promise<IShoppingMallShipment> {
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: {
      id: true,
      shopping_mall_order_item_id: true,
      shopping_mall_sellers_id: true,
      carrier_name: true,
      tracking_number: true,
      status: true,
      shipped_at: true,
      delivered_at: true,
      customer_confirmed_delivery: true,
      shipping_address: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  // Access control: seller can only access their own shipments
  if (shipment.shopping_mall_sellers_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: shipment.id,
    shopping_mall_order_item_id: shipment.shopping_mall_order_item_id,
    shopping_mall_sellers_id: shipment.shopping_mall_sellers_id,
    carrier_name: shipment.carrier_name,
    tracking_number: shipment.tracking_number,
    status: shipment.status,
    shipped_at: shipment.shipped_at
      ? toISOStringSafe(shipment.shipped_at)
      : null,
    delivered_at: shipment.delivered_at
      ? toISOStringSafe(shipment.delivered_at)
      : null,
    customer_confirmed_delivery: shipment.customer_confirmed_delivery,
    shipping_address: shipment.shipping_address,
    created_at: toISOStringSafe(shipment.created_at),
    updated_at: toISOStringSafe(shipment.updated_at),
  };
}
