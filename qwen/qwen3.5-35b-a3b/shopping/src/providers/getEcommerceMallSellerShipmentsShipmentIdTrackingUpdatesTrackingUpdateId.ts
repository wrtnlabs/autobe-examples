import { IEcommerceMallShipmentTrackingUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentTrackingUpdate";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShipmentTrackingUpdateTransformer } from "../transformers/EcommerceMallShipmentTrackingUpdateTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerShipmentsShipmentIdTrackingUpdatesTrackingUpdateId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  trackingUpdateId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipmentTrackingUpdate> {
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: { ecommerce_mall_seller_id: true },
    });
  if (shipment.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const trackingUpdate =
    await MyGlobal.prisma.ecommerce_mall_shipment_tracking_updates.findUniqueOrThrow(
      {
        where: {
          id: props.trackingUpdateId,
          shipment_id: props.shipmentId,
          deleted_at: null,
        },
        ...EcommerceMallShipmentTrackingUpdateTransformer.select(),
      },
    );
  return await EcommerceMallShipmentTrackingUpdateTransformer.transform(
    trackingUpdate,
  );
}
