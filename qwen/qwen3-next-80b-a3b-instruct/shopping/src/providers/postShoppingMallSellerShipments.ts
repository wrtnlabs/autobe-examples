import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerShipments(props: {
  seller: SellerPayload;
  body: IShoppingMallShipment.ICreate;
}): Promise<void> {
  const { seller, body } = props;
  // Validate required fields: empty string is invalid
  if (body.carrier_name.trim().length === 0) {
    throw new HttpException("Carrier name is required", 400);
  }
  if (body.tracking_number.trim().length === 0) {
    throw new HttpException("Tracking number is required", 400);
  }
  // Fetch all order items in single query for atomic validation
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      id: { in: body.order_item_ids },
      shopping_mall_seller_id: seller.id,
      status: "paid",
      deleted_at: null,
    },
    select: { id: true, status: true, shopping_mall_order_id: true },
  });
  // Validate: all requested items must exist and be paid
  if (orderItems.length !== body.order_item_ids.length) {
    throw new HttpException(
      "One or more order items not found or not in paid status",
      400,
    );
  }
  // Validate: all order items must belong to the same order
  const uniqueOrderIds = new Set(
    orderItems.map((item) => item.shopping_mall_order_id),
  );
  if (uniqueOrderIds.size > 1) {
    throw new HttpException("Order items must belong to the same order", 400);
  }
  // Construct shipment create input using validated collector
  const shipmentInput = await ShoppingMallShipmentCollector.collect({
    body,
    shoppingMallOrders: {
      id: orderItems[0].shopping_mall_order_id,
    },
    shoppingMallSellers: {
      id: seller.id,
    },
  });
  // Execute transaction: create shipment, update order item statuses, create shipment_items
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Create shipment
    const shipment = await prisma.shopping_mall_shipments.create({
      data: shipmentInput,
    });
    // Update each order item status to 'shipped'
    await Promise.all(
      orderItems.map((item) =>
        prisma.shopping_mall_order_items.update({
          where: { id: item.id },
          data: {
            status: "shipped",
            updated_at: toISOStringSafe(new Date()),
          },
        }),
      ),
    );
    // Create shipment_items records linking shipment to order items
    await Promise.all(
      body.order_item_ids.map((order_item_id: string) =>
        prisma.shopping_mall_shipment_items.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            shipment: { connect: { id: shipment.id } },
            orderItem: { connect: { id: order_item_id } },
          },
        }),
      ),
    );
    // Update parent order to 'shipped' if no paid items remain
    const remainingPaidItems = await prisma.shopping_mall_order_items.count({
      where: {
        shopping_mall_order_id: orderItems[0].shopping_mall_order_id,
        status: "paid",
        deleted_at: null,
      },
    });
    if (remainingPaidItems === 0) {
      await prisma.shopping_mall_orders.update({
        where: { id: orderItems[0].shopping_mall_order_id },
        data: {
          status: "shipped",
          updated_at: toISOStringSafe(new Date()),
        },
      });
    }
  });
}
