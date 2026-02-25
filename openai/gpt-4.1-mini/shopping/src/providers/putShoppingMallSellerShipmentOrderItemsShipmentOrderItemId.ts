import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentOrderItemTransformer } from "../transformers/ShoppingMallShipmentOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerShipmentOrderItemsShipmentOrderItemId(props: {
  seller: SellerPayload;
  shipmentOrderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentOrderItem.IUpdate;
}): Promise<IShoppingMallShipmentOrderItem> {
  const existingRecord =
    await MyGlobal.prisma.shopping_mall_shipment_order_items.findUnique({
      where: { id: props.shipmentOrderItemId },
      select: {
        id: true,
        shopping_mall_shipment_id: true,
        shopping_mall_order_item_id: true,
      },
    });
  if (!existingRecord) {
    throw new HttpException("Shipment order item not found", 404);
  }
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: existingRecord.shopping_mall_shipment_id },
    select: { seller_id: true },
  });
  if (!shipment || shipment.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const data: Prisma.shopping_mall_shipment_order_itemsUpdateInput = {};
  if (props.body.shoppingMallShipmentId !== undefined) {
    data.shipment = {
      connect: { id: props.body.shoppingMallShipmentId },
    };
  }
  if (props.body.shoppingMallOrderItemId !== undefined) {
    data.orderItem = {
      connect: { id: props.body.shoppingMallOrderItemId },
    };
  }
  await MyGlobal.prisma.shopping_mall_shipment_order_items.update({
    where: { id: props.shipmentOrderItemId },
    data,
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_shipment_order_items.findUniqueOrThrow({
      where: { id: props.shipmentOrderItemId },
      ...ShoppingMallShipmentOrderItemTransformer.select(),
    });
  return await ShoppingMallShipmentOrderItemTransformer.transform(updated);
}
