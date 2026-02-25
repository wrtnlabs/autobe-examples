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

export async function deleteShoppingMallSellerShipmentOrderItemsShipmentOrderItemId(props: {
  seller: SellerPayload;
  shipmentOrderItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Retrieve the shipment order item and its related shipment, including seller_id
  const shipmentOrderItem =
    await MyGlobal.prisma.shopping_mall_shipment_order_items.findUniqueOrThrow({
      where: { id: props.shipmentOrderItemId },
      select: {
        id: true,
        shipment: {
          select: {
            id: true,
            seller_id: true,
          },
        },
      },
    });
  // Verify that the current seller owns the shipment
  if (shipmentOrderItem.shipment.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Proceed to delete the shipment order item by id
  await MyGlobal.prisma.shopping_mall_shipment_order_items.delete({
    where: { id: props.shipmentOrderItemId },
  });
}
