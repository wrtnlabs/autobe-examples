import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
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

export async function getShoppingMallSellerShipmentItemsShipmentItemId(props: {
  seller: SellerPayload;
  shipmentItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipmentItem> {
  const shipmentItem =
    await MyGlobal.prisma.shopping_mall_shipment_items.findUnique({
      where: { id: props.shipmentItemId },
      include: {
        shipment: {
          select: { seller_id: true },
        },
      },
    });
  if (!shipmentItem || shipmentItem.deleted_at !== null) {
    throw new HttpException("Shipment item not found", 404);
  }
  if (shipmentItem.shipment.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: shipmentItem.id,
    shipment_id: shipmentItem.shipment_id,
    order_item_id: shipmentItem.order_item_id,
    created_at: toISOStringSafe(shipmentItem.created_at),
    updated_at: toISOStringSafe(shipmentItem.updated_at),
    deleted_at:
      shipmentItem.deleted_at === null
        ? null
        : toISOStringSafe(shipmentItem.deleted_at),
  };
}
