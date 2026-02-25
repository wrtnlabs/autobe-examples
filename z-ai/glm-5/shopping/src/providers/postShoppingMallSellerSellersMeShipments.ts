import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallOrderShipmentCollector } from "../collectors/ShoppingMallOrderShipmentCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderShipmentTransformer } from "../transformers/ShoppingMallOrderShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerSellersMeShipments(props: {
  seller: SellerPayload;
  body: IShoppingMallOrderShipment.ICreate;
}): Promise<IShoppingMallOrderShipment> {
  // Validate all order items exist, have 'paid' status, and belong to seller
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      id: { in: props.body.orderItemIds },
      shopping_mall_seller_id: props.seller.id,
      status: "paid",
    },
    select: { id: true },
  });
  if (orderItems.length !== props.body.orderItemIds.length) {
    throw new HttpException(
      "Some order items are invalid: not found, not 'paid' status, or not owned by seller",
      400,
    );
  }
  // Create shipment using collector (collector generates UUID internally)
  const shipment = await MyGlobal.prisma.shopping_mall_order_shipments.create({
    data: await ShoppingMallOrderShipmentCollector.collect({
      body: props.body,
      shoppingMallSellers: { id: props.seller.id },
      shoppingMallSellerSessions: { id: props.seller.session_id },
    }),
    ...ShoppingMallOrderShipmentTransformer.select(),
  });
  // Create junction records and update order items status
  const now = new Date();
  for (const orderItemId of props.body.orderItemIds) {
    await MyGlobal.prisma.shopping_mall_order_shipment_items.create({
      data: {
        id: v4(),
        shipment: { connect: { id: shipment.id } },
        orderItem: { connect: { id: orderItemId } },
        created_at: now,
        updated_at: now,
      },
    });
    await MyGlobal.prisma.shopping_mall_order_items.update({
      where: { id: orderItemId },
      data: { status: "shipped" },
    });
  }
  return ShoppingMallOrderShipmentTransformer.transform(shipment);
}
