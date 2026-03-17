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
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: {
        id: props.shipmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
        status: true,
      },
    });
  if (shipment.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (shipment.status === "delivered") {
    throw new HttpException(
      "Cannot update tracking codes for delivered shipment",
      400,
    );
  }
  const trackingCodes = props.body.tracking_codes;
  if (trackingCodes.length < 1) {
    throw new HttpException("At least one tracking code is required", 400);
  }
  const seenCodes = new Set<string>();
  for (const code of trackingCodes) {
    if (seenCodes.has(code.trackingCode)) {
      throw new HttpException("Duplicate tracking code", 400);
    }
    seenCodes.add(code.trackingCode);
  }
  await MyGlobal.prisma.ecommerce_mall_shipment_tracking_codes.deleteMany({
    where: { shipment_id: props.shipmentId },
  });
  await MyGlobal.prisma.ecommerce_mall_shipment_tracking_codes.createMany({
    data: trackingCodes.map((code) => ({
      id: v4() as string & tags.Format<"uuid">,
      shipment_id: props.shipmentId,
      carrier_name: code.carrierName,
      tracking_code: code.trackingCode,
      created_at: new Date(),
      updated_at: new Date(),
    })),
  });
  await MyGlobal.prisma.ecommerce_mall_shipments.update({
    where: { id: props.shipmentId },
    data: {
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
    },
  });
  const updatedShipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...EcommerceMallShipmentTransformer.select(),
    });
  return await EcommerceMallShipmentTransformer.transform(updatedShipment);
}
