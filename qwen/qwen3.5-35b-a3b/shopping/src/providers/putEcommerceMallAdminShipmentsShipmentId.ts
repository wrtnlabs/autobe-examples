import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
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

export async function putEcommerceMallAdminShipmentsShipmentId(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipment.IUpdate;
}): Promise<IEcommerceMallShipment> {
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.ecommerce_mall_shipments.findUnique({
      where: { id: props.shipmentId },
    });
    if (existing === null) {
      throw new HttpException("Shipment not found", 404);
    }
    if (existing.deleted_at !== null) {
      throw new HttpException("Shipment not found", 404);
    }
    const snapshot = await tx.ecommerce_mall_shipment_snapshots.create({
      data: {
        id: v4(),
        ecommerce_mall_shipment_id: props.shipmentId,
        tracking_number: "",
        carrier_name: existing.carrier_name,
        carrier_contact: null,
        status: existing.status,
        estimated_delivery_date: existing.estimated_delivery_at,
        actual_delivery_date: existing.delivered_at,
        shipped_date: existing.shipped_at,
        tracking_url: null,
        shipping_method: null,
        weight_kg: null,
        dimensions_length_cm: null,
        dimensions_width_cm: null,
        dimensions_height_cm: null,
        delivery_address: existing.delivery_address,
        signature_required: null,
        signature_obtained: null,
        delivery_notes: null,
        exception_description: null,
        created_at: new Date(),
      },
    });
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };
    if (props.body.delivery_address !== undefined) {
      updateData.delivery_address = props.body.delivery_address;
    }
    if (props.body.estimated_delivery_at !== undefined) {
      updateData.estimated_delivery_at = props.body.estimated_delivery_at;
    }
    const updated = await tx.ecommerce_mall_shipments.update({
      where: { id: props.shipmentId },
      data: updateData,
      ...EcommerceMallShipmentTransformer.select(),
    });
    return updated;
  });
  return EcommerceMallShipmentTransformer.transform(updated);
}
