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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderAtSummaryTransformer } from "../transformers/EcommerceMallOrderAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "../transformers/EcommerceMallSellerAtSummaryTransformer";
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerShipmentsShipmentId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipment.IUpdate;
}): Promise<IEcommerceMallShipment> {
  // Load shipment with all fields needed for validation and response
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
        status: true,
        shipped_at: true,
        delivered_at: true,
        estimated_delivery_at: true,
        delivery_address: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: EcommerceMallOrderAtSummaryTransformer.select(),
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
      },
    });
  // Authorization: seller must own the shipment
  if (shipment.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Prepare update data with only allowed fields
  const updateData: {
    estimated_delivery_at?:
      | (string & tags.Format<"date-time">)
      | null
      | undefined;
    delivery_address?: string | null | undefined;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.delivery_address !== undefined) {
    updateData.delivery_address = props.body.delivery_address;
  }
  if (props.body.estimated_delivery_at !== undefined) {
    updateData.estimated_delivery_at = props.body.estimated_delivery_at;
  }
  // Execute transaction: update shipment and create snapshot
  const [updated, snapshot] = await MyGlobal.prisma.$transaction(async (tx) => {
    // Apply update
    const updatedRecord = await tx.ecommerce_mall_shipments.update({
      where: {
        id: props.shipmentId,
        deleted_at: null,
      },
      data: updateData,
      select: {
        id: true,
        carrier_name: true,
        carrier_phone: true,
        carrier_website: true,
        status: true,
        shipped_at: true,
        delivered_at: true,
        estimated_delivery_at: true,
        delivery_address: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        snapshots: true,
        orderItems: true,
        trackingUpdates: true,
        trackingCodes: true,
        order: EcommerceMallOrderAtSummaryTransformer.select(),
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
      },
    });
    // Create snapshot for audit trail after update
    const snapshotRecord = await tx.ecommerce_mall_shipment_snapshots.create({
      data: {
        id: v4(),
        ecommerce_mall_shipment_id: props.shipmentId,
        tracking_number: shipment.id,
        carrier_name: shipment.carrier_name ?? undefined,
        status: shipment.status,
        shipped_date: shipment.shipped_at,
        estimated_delivery_date: shipment.estimated_delivery_at,
        delivery_address: shipment.delivery_address ?? undefined,
        created_at: new Date(),
      },
    });
    return [updatedRecord, snapshotRecord];
  });
  return await EcommerceMallShipmentTransformer.transform(updated);
}
