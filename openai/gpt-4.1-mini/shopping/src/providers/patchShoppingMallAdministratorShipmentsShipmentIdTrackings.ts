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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorShipmentsShipmentIdTrackings(props: {
  administrator: AdministratorPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentTracking.ICreate;
}): Promise<IShoppingMallShipmentTracking> {
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
  });
  if (!shipment || shipment.deleted_at !== null) {
    throw new HttpException("Shipment not found", 404);
  }
  // Unsafe cast is needed because ICreate is empty but expected to carry these fields logically.
  const carrier_name = (props.body as any).carrier_name as string;
  const tracking_number = (props.body as any).tracking_number as string;
  const data = await ShoppingMallShipmentTrackingCollector.collect({
    body: props.body,
    shipment: shipment,
    carrier_name,
    tracking_number,
  });
  const created = await MyGlobal.prisma.shopping_mall_shipment_trackings.create(
    {
      data: data,
    },
  );
  return {
    id: created.id,
    shopping_mall_shipment_id: created.shopping_mall_shipment_id,
    carrier_name: created.carrier_name,
    tracking_number: created.tracking_number,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at,
  };
}
