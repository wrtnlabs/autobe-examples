import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
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

export async function putShoppingMallSellerShipmentItemsShipmentItemId(props: {
  seller: SellerPayload;
  shipmentItemId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentItem.IUpdate;
}): Promise<IShoppingMallShipmentItem> {
  const shipmentItem =
    await MyGlobal.prisma.shopping_mall_shipment_items.findUnique({
      where: { id: props.shipmentItemId },
      include: { shipment: true },
    });
  if (!shipmentItem) {
    throw new HttpException("Shipment item not found", 404);
  }
  // Authorize: check that shipment belongs to seller
  if ((shipmentItem.shipment as any).seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Determine if 'order_item_id' is present in the body
  const hasOrderItemId = Object.prototype.hasOwnProperty.call(
    props.body,
    "order_item_id",
  );
  if (hasOrderItemId) {
    const orderItemId = (props.body as any)["order_item_id"];
    if (orderItemId !== undefined) {
      const orderItemExists =
        await MyGlobal.prisma.shopping_mall_order_items.findUnique({
          where: { id: orderItemId },
        });
      if (!orderItemExists) {
        throw new HttpException("Order item not found", 404);
      }
    }
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const now = toISOStringSafe(new Date());
    const data: any = { updated_at: now };
    if (hasOrderItemId) {
      const orderItemId = (props.body as any)["order_item_id"];
      data.order_item_id = orderItemId;
    }
    const updatedRecord = await tx.shopping_mall_shipment_items.update({
      where: { id: props.shipmentItemId },
      data,
      include: {
        shipment: true,
        orderItem: true,
      },
    });
    return updatedRecord;
  });
  return {
    id: updated.id,
    shipment_id: updated.shipment_id,
    order_item_id: updated.order_item_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    shipment: updated.shipment,
    orderItem: updated.orderItem,
  };
}
