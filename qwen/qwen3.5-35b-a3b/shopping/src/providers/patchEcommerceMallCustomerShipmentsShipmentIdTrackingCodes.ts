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
  // 1. Verify shipment exists and is not deleted
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: { id: true, ecommerce_mall_order_id: true, deleted_at: true },
    });
  if (shipment.deleted_at !== null) {
    throw new HttpException("Shipment has been deleted", 404);
  }
  // 2. Verify customer owns this shipment by checking order ownership
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirst({
    where: {
      id: shipment.ecommerce_mall_order_id,
      customer_id: props.customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (order === null) {
    throw new HttpException("Shipment does not belong to this customer", 403);
  }
  // 3. Validate tracking codes
  if (props.body.tracking_codes.length === 0) {
    throw new HttpException("At least one tracking code is required", 400);
  }
  // Check for duplicate tracking codes within the shipment and validate strings
  const trackingCodeSet = new Set<string>();
  for (const code of props.body.tracking_codes) {
    if (!code.trackingCode || code.trackingCode.trim().length === 0) {
      throw new HttpException("Tracking code cannot be empty", 400);
    }
    if (!code.carrierName || code.carrierName.trim().length === 0) {
      throw new HttpException("Carrier name cannot be empty", 400);
    }
    if (trackingCodeSet.has(code.trackingCode)) {
      throw new HttpException("Duplicate tracking codes not allowed", 409);
    }
    trackingCodeSet.add(code.trackingCode);
  }
  // 4. Delete existing tracking codes for this shipment
  await MyGlobal.prisma.ecommerce_mall_shipment_tracking_codes.deleteMany({
    where: { shipment_id: props.shipmentId },
  });
  // 5. Insert new tracking codes
  const now = new Date();
  await MyGlobal.prisma.ecommerce_mall_shipment_tracking_codes.createMany({
    data: props.body.tracking_codes.map((code) => ({
      id: v4() as string & tags.Format<"uuid">,
      shipment_id: props.shipmentId,
      carrier_name: code.carrierName,
      tracking_code: code.trackingCode,
      created_at: now,
      updated_at: now,
    })),
  });
  // 6. Update shipment with new carrier info (only if provided) and timestamp
  await MyGlobal.prisma.ecommerce_mall_shipments.update({
    where: { id: props.shipmentId },
    data: {
      ...(props.body.carrier_name !== undefined && {
        carrier_name: props.body.carrier_name,
      }),
      ...(props.body.carrier_phone !== undefined && {
        carrier_phone: props.body.carrier_phone,
      }),
      ...(props.body.carrier_website !== undefined && {
        carrier_website: props.body.carrier_website,
      }),
      updated_at: now,
    },
  });
  // 7. Return updated shipment using transformer
  const updatedShipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...EcommerceMallShipmentTransformer.select(),
    });
  return await EcommerceMallShipmentTransformer.transform(updatedShipment);
}
