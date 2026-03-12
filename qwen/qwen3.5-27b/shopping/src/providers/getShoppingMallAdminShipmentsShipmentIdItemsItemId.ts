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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallOrderItemTransformer } from "../transformers/ShoppingMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminShipmentsShipmentIdItemsItemId(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  const shipmentItem =
    await MyGlobal.prisma.shopping_mall_shipment_items.findFirst({
      where: {
        shopping_mall_shipment_id: props.shipmentId,
        shopping_mall_order_item_id: props.itemId,
        shipment: {
          deleted_at: null,
        },
        orderItem: {
          deleted_at: null,
        },
      },
    });
  if (shipmentItem === null) {
    throw new HttpException("Order item not found in shipment", 404);
  }
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: {
        id: props.itemId,
        deleted_at: null,
      },
      ...ShoppingMallOrderItemTransformer.select(),
    });
  return await ShoppingMallOrderItemTransformer.transform(orderItem);
}
