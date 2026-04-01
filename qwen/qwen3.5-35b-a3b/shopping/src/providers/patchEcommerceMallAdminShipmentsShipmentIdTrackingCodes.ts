import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminShipmentsShipmentIdTrackingCodes(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipment.IUpdateTrackingCode;
}): Promise<IEcommerceMallShipment> {
  // Step 1: Verify shipment exists and is not deleted
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: {
        id: props.shipmentId,
        deleted_at: null,
      },
    });
  // Step 2: Delete all existing tracking codes for this shipment
  await MyGlobal.prisma.ecommerce_mall_shipment_tracking_codes.deleteMany({
    where: {
      shipment_id: props.shipmentId,
    },
  });
  // Step 3: Validate tracking codes array and check for duplicates
  if (props.body.tracking_codes.length === 0) {
    throw new HttpException("Tracking codes array must not be empty", 400);
  }
  // Check for duplicate tracking codes within the same shipment
  const trackingCodeSet = new Set<string>();
  for (const trackingCode of props.body.tracking_codes) {
    if (trackingCodeSet.has(trackingCode.trackingCode)) {
      throw new HttpException("Duplicate tracking code within shipment", 400);
    }
    trackingCodeSet.add(trackingCode.trackingCode);
  }
  // Create all tracking codes in a single operation
  await MyGlobal.prisma.ecommerce_mall_shipment_tracking_codes.createMany({
    data: props.body.tracking_codes.map((trackingCode) => {
      const id = v4() as string & tags.Format<"uuid">;
      return {
        id,
        shipment_id: props.shipmentId,
        carrier_name: trackingCode.carrierName,
        tracking_code: trackingCode.trackingCode,
        created_at: new Date(),
        updated_at: new Date(),
      };
    }),
  });
  // Step 4: Update shipment's carrier information and timestamp
  await MyGlobal.prisma.ecommerce_mall_shipments.update({
    where: { id: props.shipmentId },
    data: {
      carrier_name: props.body.carrier_name ?? shipment.carrier_name,
      carrier_phone: props.body.carrier_phone ?? shipment.carrier_phone,
      carrier_website: props.body.carrier_website ?? shipment.carrier_website,
      updated_at: new Date(),
    },
  });
  // Step 5: Return the updated shipment with all tracking codes
  const updatedShipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...EcommerceMallShipmentTransformer.select(),
    });
  return await EcommerceMallShipmentTransformer.transform(updatedShipment);
}
