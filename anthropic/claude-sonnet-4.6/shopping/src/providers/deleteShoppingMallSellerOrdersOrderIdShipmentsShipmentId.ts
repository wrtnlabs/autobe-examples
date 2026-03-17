import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallSellerOrdersOrderIdShipmentsShipmentId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_seller_id: true,
        deleted_at: true,
        delivered_at: true,
      },
    });
  if (shipment.shopping_mall_order_id !== props.orderId) {
    throw new HttpException("Shipment not found in the specified order", 404);
  }
  if (shipment.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: you do not own this shipment", 403);
  }
  if (shipment.deleted_at !== null) {
    throw new HttpException("Shipment has already been deleted", 404);
  }
  if (shipment.delivered_at !== null) {
    throw new HttpException(
      "Cannot delete a shipment that has already been delivered",
      422,
    );
  }
  await MyGlobal.prisma.shopping_mall_shipments.update({
    where: { id: props.shipmentId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
