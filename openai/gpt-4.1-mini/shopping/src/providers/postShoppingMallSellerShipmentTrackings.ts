import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentTrackingTransformer } from "../transformers/ShoppingMallShipmentTrackingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerShipmentTrackings(props: {
  seller: SellerPayload;
  body: IShoppingMallShipmentTracking.IShipmentTrackingCreate;
}): Promise<IShoppingMallShipmentTracking> {
  // Verify the shipment exists and belongs to the current seller
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.body.shipment_id },
    select: { id: true, seller_id: true, deleted_at: true },
  });
  if (!shipment || shipment.deleted_at !== null) {
    throw new HttpException("Shipment not found", 404);
  }
  if (shipment.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Prepare timestamps as string with format
  const now = new Date();
  const createdAt = toISOStringSafe(now) as string & tags.Format<"date-time">;
  const updatedAt = createdAt;
  // Insert the new shipment tracking record
  const created = await MyGlobal.prisma.shopping_mall_shipment_trackings.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_shipment_id: props.body.shipment_id,
        carrier_name: props.body.carrier_name,
        tracking_number: props.body.tracking_number,
        deleted_at: null,
        created_at: createdAt,
        updated_at: updatedAt,
      },
      ...ShoppingMallShipmentTrackingTransformer.select(),
    },
  );
  // Transform to output DTO
  return await ShoppingMallShipmentTrackingTransformer.transform(created);
}
