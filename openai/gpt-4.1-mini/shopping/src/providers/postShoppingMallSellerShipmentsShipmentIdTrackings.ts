import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallShipmentTrackingCollector } from "../collectors/ShoppingMallShipmentTrackingCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerShipmentsShipmentIdTrackings(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentTracking.ICreate;
}): Promise<IShoppingMallShipmentTracking> {
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (shipment === null) {
    throw new HttpException("Shipment not found or unauthorized", 404);
  }
  // Since IShoppingMallShipmentTracking.ICreate is empty type, forcibly cast props.body to any
  const body = props.body as any;
  const creationData = await ShoppingMallShipmentTrackingCollector.collect({
    body: props.body,
    shipment: shipment,
    carrier_name: body.carrierName ?? body.carrier_name,
    tracking_number: body.trackingNumber ?? body.tracking_number,
  });
  const created = await MyGlobal.prisma.shopping_mall_shipment_trackings.create(
    {
      data: creationData,
    },
  );
  return {
    id: created.id,
    shopping_mall_shipment_id: created.shopping_mall_shipment_id,
    carrier_name: created.carrier_name,
    tracking_number: created.tracking_number,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
  };
}
