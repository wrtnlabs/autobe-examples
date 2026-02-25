import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentTrackingTransformer } from "../transformers/ShoppingMallShipmentTrackingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerShipmentTrackingsShipmentTrackingId(props: {
  seller: SellerPayload;
  shipmentTrackingId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentTracking.IUpdate;
}): Promise<IShoppingMallShipmentTracking> {
  const tracking =
    await MyGlobal.prisma.shopping_mall_shipment_trackings.findUniqueOrThrow({
      where: { id: props.shipmentTrackingId },
      include: { shipment: true },
    });
  if (tracking.shipment.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_shipment_trackings.update({
    where: { id: props.shipmentTrackingId },
    data: {
      carrier_name: props.body.carrierName,
      tracking_number: props.body.trackingNumber,
      updated_at: now,
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_shipment_trackings.findUniqueOrThrow({
      where: { id: props.shipmentTrackingId },
      ...ShoppingMallShipmentTrackingTransformer.select(),
    });
  return await ShoppingMallShipmentTrackingTransformer.transform(updated);
}
