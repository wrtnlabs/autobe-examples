import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallShipmentCollector } from "../collectors/ShoppingMallShipmentCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentTransformer } from "../transformers/ShoppingMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerShipments(props: {
  seller: SellerPayload;
  body: IShoppingMallShipment.ICreate;
}): Promise<IShoppingMallShipment> {
  // Validate that the order belongs to the authenticated seller
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.body.order_id },
    select: { id: true, shopping_mall_customer_id: true },
  });
  if (order.shopping_mall_customer_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate all order items belong to the authenticated seller and have 'paid' status
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      shopping_mall_order_id: props.body.order_id,
      id: { in: props.body.items.flatMap((item) => item.item_ids) },
    },
    select: { id: true },
  });
  if (
    orderItems.length !==
    props.body.items.flatMap((item) => item.item_ids).length
  ) {
    throw new HttpException(
      "Some order items not found or not eligible for shipment",
      400,
    );
  }
  // Create shipment record
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.create({
    data: await ShoppingMallShipmentCollector.collect({
      body: props.body,
      shoppingMallOrders: { id: props.body.order_id },
      shoppingMallSellers: { id: props.seller.id },
    }),
    ...ShoppingMallShipmentTransformer.select(),
  });
  // Create shipment items
  const itemIds = props.body.items.flatMap((item) => item.item_ids);
  await MyGlobal.prisma.shopping_mall_shipment_items.createMany({
    data: itemIds.map((itemId) => ({
      id: v4(),
      shopping_mall_shipment_id: shipment.id,
      shopping_mall_order_item_id: itemId,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    })),
  });
  // Update order items status to 'shipped'
  await MyGlobal.prisma.shopping_mall_order_items.updateMany({
    where: { id: { in: itemIds } },
    data: {},
  });
  // Create status log for shipment status transition
  await MyGlobal.prisma.shopping_mall_shipment_status_logs.create({
    data: {
      id: v4(),
      shopping_mall_shipment_id: shipment.id,
      status: "shipped",
      status_at: toISOStringSafe(new Date()),
      created_at: toISOStringSafe(new Date()),
    },
  });
  // Transform and return shipment
  return await ShoppingMallShipmentTransformer.transform(shipment);
}
