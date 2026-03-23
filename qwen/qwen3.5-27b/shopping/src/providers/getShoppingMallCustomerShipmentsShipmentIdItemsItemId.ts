import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderItemTransformer } from "../transformers/ShoppingMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerShipmentsShipmentIdItemsItemId(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  // Verify the order item exists in the specified shipment
  const shipmentItem =
    await MyGlobal.prisma.shopping_mall_shipment_items.findFirst({
      where: {
        shopping_mall_shipment_id: props.shipmentId,
        shopping_mall_order_item_id: props.itemId,
      },
    });
  if (shipmentItem === null) {
    throw new HttpException("Order item not found in shipment", 404);
  }
  // Retrieve the complete order item with all relations
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: {
        id: props.itemId,
      },
      ...ShoppingMallOrderItemTransformer.select(),
    });
  // Check if order item is soft-deleted
  if (orderItem.deleted_at !== null) {
    throw new HttpException("Order item has been deleted", 404);
  }
  // Verify the shipment is not soft-deleted
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: {
      id: props.shipmentId,
    },
    select: {
      deleted_at: true,
    },
  });
  if (shipment?.deleted_at !== null) {
    throw new HttpException("Shipment has been deleted", 404);
  }
  // Verify authorization: customer must own the order
  if (orderItem.order.customer.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallOrderItemTransformer.transform(orderItem);
}
