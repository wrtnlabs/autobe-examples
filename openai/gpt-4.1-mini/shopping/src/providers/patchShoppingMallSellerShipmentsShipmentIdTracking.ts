import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
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

export async function patchShoppingMallSellerShipmentsShipmentIdTracking(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentTracking.IUpdate;
}): Promise<IShoppingMallShipmentTracking.IUpdate> {
  function getCurrentIsoDateTime(): string & tags.Format<"date-time"> {
    return toISOStringSafe(new Date());
  }
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: { id: true, seller_id: true },
  });
  if (!shipment || shipment.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Find existing tracking by normalized attribute shopping_mall_shipment_id
  const existingTracking =
    await MyGlobal.prisma.shopping_mall_shipment_trackings.findFirst({
      where: { shopping_mall_shipment_id: props.shipmentId },
    });
  const nowIso = getCurrentIsoDateTime();
  let updatedTracking;
  if (existingTracking !== null) {
    updatedTracking =
      await MyGlobal.prisma.shopping_mall_shipment_trackings.update({
        where: { id: existingTracking.id },
        data: {
          carrier_name: props.body.carrierName,
          tracking_number: props.body.trackingNumber,
          updated_at: nowIso,
        },
      });
  } else {
    const newId = v4();
    updatedTracking =
      await MyGlobal.prisma.shopping_mall_shipment_trackings.create({
        data: {
          id: newId satisfies string & tags.Format<"uuid"> as string &
            tags.Format<"uuid">,
          shipment: { connect: { id: props.shipmentId } },
          carrier_name: props.body.carrierName,
          tracking_number: props.body.trackingNumber,
          created_at: nowIso,
          updated_at: nowIso,
        },
      });
  }
  return {
    carrierName: updatedTracking.carrier_name,
    trackingNumber: updatedTracking.tracking_number,
  };
}
