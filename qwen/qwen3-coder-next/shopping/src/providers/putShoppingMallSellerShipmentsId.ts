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

export async function putShoppingMallSellerShipmentsId(props: {
  seller: SellerPayload;
  id: string;
  body: IShoppingMallShipment.IUpdate;
}): Promise<IShoppingMallShipment> {
  // Find the existing shipment to verify ownership and get current status
  const existingShipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUnique({
      where: {
        id: props.id,
        shopping_mall_sellers_id: props.seller.id,
      },
    });
  if (!existingShipment) {
    throw new HttpException("Shipment not found or access denied", 404);
  }
  // Update the shipment with only the fields that exist in IUpdate
  const updatedShipment = await MyGlobal.prisma.shopping_mall_shipments.update({
    where: {
      id: props.id,
    },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Transform to response format
  return {
    id: updatedShipment.id,
    shopping_mall_order_item_id: updatedShipment.shopping_mall_order_item_id,
    shopping_mall_sellers_id: updatedShipment.shopping_mall_sellers_id,
    carrier_name: updatedShipment.carrier_name ?? undefined,
    tracking_number: updatedShipment.tracking_number ?? undefined,
    status: updatedShipment.status,
    shipped_at: updatedShipment.shipped_at
      ? toISOStringSafe(updatedShipment.shipped_at)
      : undefined,
    delivered_at: updatedShipment.delivered_at
      ? toISOStringSafe(updatedShipment.delivered_at)
      : undefined,
    customer_confirmed_delivery: updatedShipment.customer_confirmed_delivery,
    shipping_address: updatedShipment.shipping_address,
    created_at: toISOStringSafe(updatedShipment.created_at),
    updated_at: toISOStringSafe(updatedShipment.updated_at),
  };
}
