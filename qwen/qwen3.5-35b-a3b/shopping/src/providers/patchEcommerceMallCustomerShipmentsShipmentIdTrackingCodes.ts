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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerShipmentsShipmentIdTrackingCodes(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipment.IUpdateTrackingCode;
}): Promise<IEcommerceMallShipment> {
  // Verify shipment exists and is not deleted
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: {
        id: props.shipmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
        carrier_name: true,
        carrier_phone: true,
        carrier_website: true,
      },
    });
  // Verify seller ownership
  if (shipment.ecommerce_mall_seller_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate tracking codes: at least one required
  if (props.body.tracking_codes.length < 1) {
    throw new HttpException("At least one tracking code is required", 400);
  }
  // Validate unique tracking codes within shipment
  const trackingCodeSet = new Set<string>();
  for (const tc of props.body.tracking_codes) {
    if (trackingCodeSet.has(tc.trackingCode)) {
      throw new HttpException("Duplicate tracking code within shipment", 400);
    }
    trackingCodeSet.add(tc.trackingCode);
  }
  // Delete all existing tracking codes for this shipment
  await MyGlobal.prisma.ecommerce_mall_shipment_tracking_codes.deleteMany({
    where: {
      shipment_id: props.shipmentId,
    },
  });
  // Insert new tracking codes from request body
  await Promise.all(
    props.body.tracking_codes.map(async (trackingCode) => {
      await MyGlobal.prisma.ecommerce_mall_shipment_tracking_codes.create({
        data: {
          id: v4(),
          shipment_id: props.shipmentId,
          carrier_name: trackingCode.carrierName,
          tracking_code: trackingCode.trackingCode,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }),
  );
  // Update shipment carrier fields if provided
  const updateData: Prisma.ecommerce_mall_shipmentsUpdateInput = {
    updated_at: new Date(),
    ...(props.body.carrier_name !== undefined && {
      carrier_name: props.body.carrier_name,
    }),
    ...(props.body.carrier_phone !== undefined && {
      carrier_phone: props.body.carrier_phone,
    }),
    ...(props.body.carrier_website !== undefined && {
      carrier_website: props.body.carrier_website,
    }),
  };
  await MyGlobal.prisma.ecommerce_mall_shipments.update({
    where: { id: props.shipmentId },
    data: updateData,
  });
  // Return complete shipment with all tracking codes
  const updatedShipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...EcommerceMallShipmentTransformer.select(),
    });
  return await EcommerceMallShipmentTransformer.transform(updatedShipment);
}
