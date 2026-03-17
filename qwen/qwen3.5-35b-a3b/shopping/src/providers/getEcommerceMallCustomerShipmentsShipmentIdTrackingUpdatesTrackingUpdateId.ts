import { IEcommerceMallShipmentTrackingUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentTrackingUpdate";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShipmentTrackingUpdateTransformer } from "../transformers/EcommerceMallShipmentTrackingUpdateTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerShipmentsShipmentIdTrackingUpdatesTrackingUpdateId(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  trackingUpdateId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipmentTrackingUpdate> {
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
      deleted_at: null,
    },
    select: {
      id: true,
      ecommerce_mall_order_id: true,
    },
  });
  if (shipment === null) {
    throw new HttpException("Not found", 404);
  }
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirst({
    where: {
      id: shipment.ecommerce_mall_order_id,
      deleted_at: null,
      customer: {
        id: props.customer.id,
      },
    },
    select: {
      id: true,
    },
  });
  if (order === null) {
    throw new HttpException("Forbidden", 403);
  }
  const trackingUpdate =
    await MyGlobal.prisma.ecommerce_mall_shipment_tracking_updates.findFirst({
      where: {
        id: props.trackingUpdateId,
        shipment_id: props.shipmentId,
        deleted_at: null,
      },
      ...EcommerceMallShipmentTrackingUpdateTransformer.select(),
    });
  if (trackingUpdate === null) {
    throw new HttpException("Not found", 404);
  }
  return await EcommerceMallShipmentTrackingUpdateTransformer.transform(
    trackingUpdate,
  );
}
