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

export async function postShoppingMallSellerShipmentsShipmentIdTracking(props: {
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
  const carrier_name = (props.body as any).carrier_name;
  const tracking_number = (props.body as any).tracking_number;
  if (typeof carrier_name !== "string" || typeof tracking_number !== "string") {
    throw new HttpException(
      "Missing required properties carrier_name or tracking_number",
      400,
    );
  }
  const data = await ShoppingMallShipmentTrackingCollector.collect({
    body: props.body,
    shipment: shipment,
    carrier_name,
    tracking_number,
  });
  const created = await MyGlobal.prisma.shopping_mall_shipment_trackings.create(
    {
      data,
    },
  );
  return {
    id: created.id,
    shipment_id: created.shopping_mall_shipment_id,
    carrier_name: created.carrier_name,
    tracking_number: created.tracking_number,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
