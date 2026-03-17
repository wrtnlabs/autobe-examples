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
import { EcommerceMallShipmentTrackingCodeTransformer } from "../transformers/EcommerceMallShipmentTrackingCodeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerShipmentsShipmentIdTrackingCodesTrackingCodeId(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  trackingCodeId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipmentTrackingCode> {
  // Step 1: Load tracking code with nested shipment containing order reference
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
          shipment: {
            select: {
              id: true,
              order: {
                select: {
                  id: true,
                  customer_id: true,
                },
              },
            },
          },
        },
      },
    );
  // Verify tracking code belongs to the specified shipment
  if (trackingCode.shipment_id !== props.shipmentId) {
    throw new HttpException(
      "Tracking code does not belong to this shipment",
      404,
    );
  }
  // Step 2: Authorization check - verify customer owns the order containing this shipment
  if (trackingCode.shipment.order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Return tracking code with full shipment details using transformer
  const fullTrackingCode =
    await MyGlobal.prisma.ecommerce_mall_shipment_tracking_codes.findUniqueOrThrow(
      {
        where: { id: props.trackingCodeId },
        ...EcommerceMallShipmentTrackingCodeTransformer.select(),
      },
    );
  return await EcommerceMallShipmentTrackingCodeTransformer.transform(
    fullTrackingCode,
  );
}
