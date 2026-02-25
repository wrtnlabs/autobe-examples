import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentItemTransformer } from "../transformers/ShoppingMallShipmentItemTransformer";
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
    });
  if (!shipmentItem) {
    throw new HttpException("Shipment item not found", 404);
  }
  if (props.body.shipmentId) {
    const shipment = await MyGlobal.prisma.shopping_mall_shipments.findFirst({
      where: {
        id: props.body.shipmentId,
        seller_id: props.seller.id,
        deleted_at: null,
      },
    });
    if (!shipment) {
      throw new HttpException("Shipment not found or unauthorized", 403);
    }
  }
  if (props.body.orderItemId) {
    const orderItem =
      await MyGlobal.prisma.shopping_mall_order_items.findUnique({
        where: { id: props.body.orderItemId },
      });
    if (!orderItem) {
      throw new HttpException("Order item not found", 404);
    }
  }
  await MyGlobal.prisma.shopping_mall_shipment_items.update({
    where: { id: props.shipmentItemId },
    data: {
      ...(props.body.shipmentId && { shipment_id: props.body.shipmentId }),
      ...(props.body.orderItemId && { order_item_id: props.body.orderItemId }),
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_shipment_items.findUniqueOrThrow({
      where: { id: props.shipmentItemId },
      ...ShoppingMallShipmentItemTransformer.select(),
    });
  return await ShoppingMallShipmentItemTransformer.transform(updated);
}
