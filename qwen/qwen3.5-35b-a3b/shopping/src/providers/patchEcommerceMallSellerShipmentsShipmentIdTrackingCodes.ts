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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerShipmentsShipmentIdTrackingCodes(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipment.IUpdateTrackingCode;
}): Promise<IEcommerceMallShipment> {
  // Validate tracking codes are provided
  if (props.body.tracking_codes.length === 0) {
    throw new HttpException("At least one tracking code is required", 400);
  }
  // Check for duplicate tracking codes within the request body
  const trackingCodes = props.body.tracking_codes;
  const uniqueTrackingCodes = new Set<string>();
  for (const trackingCode of trackingCodes) {
    if (uniqueTrackingCodes.has(trackingCode.trackingCode)) {
      throw new HttpException("Duplicate tracking code found", 400);
    }
    uniqueTrackingCodes.add(trackingCode.trackingCode);
  }
  // Verify shipment exists, is not deleted, and belongs to the seller
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: {
        id: props.shipmentId,
        deleted_at: null,
        ecommerce_mall_seller_id: props.seller.id,
      },
      select: {
        id: true,
        ecommerce_mall_order_id: true,
        ecommerce_mall_seller_id: true,
      },
    });
  // Delete all existing tracking codes for this shipment
  await MyGlobal.prisma.ecommerce_mall_shipment_tracking_codes.deleteMany({
    where: {
      shipment_id: props.shipmentId,
    },
  });
  // Insert new tracking codes from request body
  for (const trackingCode of trackingCodes) {
    await MyGlobal.prisma.ecommerce_mall_shipment_tracking_codes.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shipment_id: props.shipmentId,
        carrier_name: trackingCode.carrierName,
        tracking_code: trackingCode.trackingCode,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  }
  // Update shipment's updated_at timestamp
  await MyGlobal.prisma.ecommerce_mall_shipments.update({
    where: { id: props.shipmentId },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return complete shipment object with order and seller
  const updatedShipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...EcommerceMallShipmentTransformer.select(),
    });
  return await EcommerceMallShipmentTransformer.transform(updatedShipment);
}
