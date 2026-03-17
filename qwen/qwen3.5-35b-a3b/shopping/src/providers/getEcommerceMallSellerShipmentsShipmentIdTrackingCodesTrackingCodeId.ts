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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShipmentTrackingCodeTransformer } from "../transformers/EcommerceMallShipmentTrackingCodeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerShipmentsShipmentIdTrackingCodesTrackingCodeId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  trackingCodeId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipmentTrackingCode> {
  const trackingCode =
    await MyGlobal.prisma.ecommerce_mall_shipment_tracking_codes.findUniqueOrThrow(
      {
        where: {
          id: props.trackingCodeId,
          shipment_id: props.shipmentId,
        },
        ...EcommerceMallShipmentTrackingCodeTransformer.select(),
      },
    );
  const shipment =
    trackingCode.shipment as unknown as IEcommerceMallShipment.ISummary;
  if ((shipment as any).shipment_owner_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallShipmentTrackingCodeTransformer.transform(
    trackingCode,
  );
}
