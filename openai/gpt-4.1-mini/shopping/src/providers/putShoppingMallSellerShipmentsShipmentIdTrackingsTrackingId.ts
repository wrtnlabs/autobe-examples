import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerShipmentsShipmentIdTrackingsTrackingId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  trackingId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentTracking.IUpdate;
}): Promise<IShoppingMallShipmentTracking> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Verify shipment ownership
    const shipment = await tx.shopping_mall_shipments.findUnique({
      where: { id: props.shipmentId },
      select: { seller_id: true },
    });
    if (!shipment) {
      throw new HttpException("Shipment not found", 404);
    }
    if (shipment.seller_id !== props.seller.id) {
      throw new HttpException("Unauthorized to update shipment tracking", 403);
    }
    // Verify tracking record
    const tracking = await tx.shopping_mall_shipment_trackings.findUnique({
      where: { id: props.trackingId },
      select: {
        id: true,
        shopping_mall_shipment_id: true,
        carrier_name: true,
        tracking_number: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    if (!tracking) {
      throw new HttpException("Shipment tracking record not found", 404);
    }
    if (tracking.shopping_mall_shipment_id !== props.shipmentId) {
      throw new HttpException(
        "Tracking record does not belong to the shipment",
        400,
      );
    }
    // Prepare update data
    const dataToUpdate: {
      carrier_name?: {
        set: string | null;
      };
      tracking_number?: {
        set: string | null;
      };
    } = {};
    if ("carrier_name" in props.body) {
      const val = props.body["carrier_name"];
      if (val !== undefined) dataToUpdate.carrier_name = { set: val };
    }
    if ("tracking_number" in props.body) {
      const val = props.body["tracking_number"];
      if (val !== undefined) dataToUpdate.tracking_number = { set: val };
    }
    // Execute update
    const updated = await tx.shopping_mall_shipment_trackings.update({
      where: { id: props.trackingId },
      data: dataToUpdate,
    });
    // Return transformed result
    return {
      id: updated.id,
      shopping_mall_shipment_id: updated.shopping_mall_shipment_id,
      carrier_name: updated.carrier_name ?? null,
      tracking_number: updated.tracking_number ?? null,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at: updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : null,
    };
  });
}
