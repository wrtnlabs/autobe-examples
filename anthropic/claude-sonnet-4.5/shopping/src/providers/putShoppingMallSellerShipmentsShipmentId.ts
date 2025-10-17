import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerShipmentsShipmentId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IUpdate;
}): Promise<IShoppingMallShipment> {
  const { seller, shipmentId, body } = props;

  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: shipmentId },
    });

  if (shipment.created_by_seller_id !== seller.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own shipments",
      403,
    );
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_shipments.update({
    where: { id: shipmentId },
    data: {
      carrier_name: body.carrier_name ?? undefined,
      tracking_number: body.tracking_number ?? undefined,
      shipping_method: body.shipping_method ?? undefined,
      shipment_status: body.shipment_status ?? undefined,
      estimated_delivery_date:
        body.estimated_delivery_date === undefined
          ? undefined
          : body.estimated_delivery_date === null
            ? null
            : toISOStringSafe(body.estimated_delivery_date),
      actual_delivery_date:
        body.actual_delivery_date === undefined
          ? undefined
          : body.actual_delivery_date === null
            ? null
            : toISOStringSafe(body.actual_delivery_date),
      delivery_signature:
        body.delivery_signature === undefined
          ? undefined
          : body.delivery_signature === null
            ? null
            : body.delivery_signature,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    tracking_number: updated.tracking_number,
  };
}
