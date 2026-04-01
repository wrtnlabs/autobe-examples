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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShipmentAtSummaryTransformer } from "../transformers/EcommerceMallShipmentAtSummaryTransformer";
import { EcommerceMallShipmentTrackingCodeTransformer } from "../transformers/EcommerceMallShipmentTrackingCodeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerShipmentsShipmentIdTrackingCodesTrackingCodeId(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  trackingCodeId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipmentTrackingCode> {
  const trackingCodeWithShipment =
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
  if (trackingCodeWithShipment.shipment_id !== props.shipmentId) {
    throw new HttpException(
      "Tracking code does not belong to this shipment",
      404,
    );
  }
  await MyGlobal.prisma.ecommerce_mall_orders.findFirstOrThrow({
    where: {
      id: trackingCodeWithShipment.shipment.order.id,
      customer_id: props.customer.id,
    },
  });
  return await EcommerceMallShipmentTrackingCodeTransformer.transform(
    trackingCodeWithShipment,
  );
}
