import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentTrackingCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentTrackingCode";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallShipmentAtSummaryTransformer } from "../transformers/EcommerceMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminShipmentsShipmentIdTrackingCodesTrackingCodeId(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  trackingCodeId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipmentTrackingCode> {
  const trackingCode =
    await MyGlobal.prisma.ecommerce_mall_shipment_tracking_codes.findUniqueOrThrow(
      {
        where: { id: props.trackingCodeId },
        select: {
          id: true,
          shipment_id: true,
          carrier_name: true,
          tracking_code: true,
          created_at: true,
          updated_at: true,
          shipment: EcommerceMallShipmentAtSummaryTransformer.select(),
        },
      },
    );
  if (trackingCode.shipment_id !== props.shipmentId) {
    throw new HttpException(
      "Tracking code does not belong to specified shipment",
      404,
    );
  }
  return {
    id: trackingCode.id,
    shipment: await EcommerceMallShipmentAtSummaryTransformer.transform(
      trackingCode.shipment,
    ),
    carrier_name: trackingCode.carrier_name,
    tracking_code: trackingCode.tracking_code,
    created_at: trackingCode.created_at.toISOString(),
    updated_at: trackingCode.updated_at.toISOString(),
  };
}
