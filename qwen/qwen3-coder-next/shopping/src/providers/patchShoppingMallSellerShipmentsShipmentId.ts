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

export async function patchShoppingMallSellerShipmentsShipmentId(props: {
  seller: SellerPayload;
  shipmentId: string;
  body: IShoppingMallShipment.IUpdate;
}): Promise<IShoppingMallShipment> {
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.update({
    where: {
      id: props.shipmentId,
      shopping_mall_sellers_id: props.seller.id,
    },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found or unauthorized", 404);
  }
  return {
    id: shipment.id as string & tags.Format<"uuid">,
    shopping_mall_order_item_id:
      shipment.shopping_mall_order_item_id as string & tags.Format<"uuid">,
    shopping_mall_sellers_id: shipment.shopping_mall_sellers_id as string &
      tags.Format<"uuid">,
    shipped_at: shipment.shipped_at
      ? (toISOStringSafe(shipment.shipped_at) as string &
          tags.Format<"date-time">)
      : undefined,
    delivered_at: shipment.delivered_at
      ? (toISOStringSafe(shipment.delivered_at) as string &
          tags.Format<"date-time">)
      : undefined,
    created_at: (shipment.created_at
      ? toISOStringSafe(shipment.created_at)
      : shipment.created_at) as string & tags.Format<"date-time">,
    updated_at: (shipment.updated_at
      ? toISOStringSafe(shipment.updated_at)
      : shipment.updated_at) as string & tags.Format<"date-time">,
  };
}
