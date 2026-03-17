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

export async function deleteShoppingMallSellerOrdersOrderIdShipmentsShipmentIdItemsShipmentItemId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  shipmentItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Step 1: Verify the order exists
    await tx.shopping_mall_orders.findUniqueOrThrow({
      where: { id: props.orderId },
      select: { id: true },
    });
    // Step 2: Find the shipment and verify it belongs to the order
    const shipment = await tx.shopping_mall_shipments.findFirst({
      where: {
        id: props.shipmentId,
        shopping_mall_order_id: props.orderId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
    if (shipment === null) {
      throw new HttpException(
        "Shipment not found or does not belong to the specified order",
        404,
      );
    }
    // Step 3: Verify seller ownership
    if (shipment.shopping_mall_seller_id !== props.seller.id) {
      throw new HttpException("Forbidden: You do not own this shipment", 403);
    }
    // Step 4: Find the shipment item and verify it belongs to the shipment
    const shipmentItem = await tx.shopping_mall_shipment_items.findFirst({
      where: {
        id: props.shipmentItemId,
        shopping_mall_shipment_id: props.shipmentId,
      },
      select: { id: true },
    });
    if (shipmentItem === null) {
      throw new HttpException(
        "Shipment item not found or does not belong to the specified shipment",
        404,
      );
    }
    // Step 5: Delete the shipment item junction record
    await tx.shopping_mall_shipment_items.delete({
      where: { id: props.shipmentItemId },
    });
  });
}
