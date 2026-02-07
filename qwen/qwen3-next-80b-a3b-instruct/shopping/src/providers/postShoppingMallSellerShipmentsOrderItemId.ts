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

export async function postShoppingMallSellerShipmentsOrderItemId(props: {
  seller: SellerPayload;
  orderItemId: string;
  body: IShoppingMallShipment.ICreate;
}): Promise<IShoppingMallShipment> {
  // Validate order item exists and is paid
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.orderItemId },
    select: { id: true, status: true, seller_id: true },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Order item status must be 'paid' to create shipment",
      400,
    );
  }
  // Verify order item belongs to authenticated seller
  if (orderItem.seller_id !== props.seller.id) {
    throw new HttpException(
      "Order item does not belong to authenticated seller",
      403,
    );
  }
  // Use the authorized collector function to transform API request to database input
  // The collector knows how to map IShoppingMallShipment.ICreate to shopping_mall_shipments schema
  // Even though IShoppingMallShipment.ICreate is empty, the collector knows the business requirements
  const createData = await ShoppingMallShipmentCollector.collect({
    body: props.body,
    shoppingMallOrderItems: { id: props.orderItemId },
    shoppingMallSellers: { id: props.seller.id },
    shoppingMallSellerSessions: { id: props.seller.session_id },
  });
  const createdAt = toISOStringSafe(new Date());
  const createdShipment = await MyGlobal.prisma.$transaction(async (prisma) => {
    const shipment = await prisma.shopping_mall_shipments.create({
      data: createData,
    });
    await prisma.shopping_mall_order_items.update({
      where: { id: props.orderItemId },
      data: { status: "shipped" },
    });
    return shipment;
  });
  // Use the appropriate transformer to convert database result to response DTO
  // Since no transformer for IShoppingMallShipment exists, manually map fields
  return {
    id: createdShipment.id,
    carrier: createdShipment.carrier,
    tracking_number: createdShipment.tracking_number,
    status: createdShipment.status,
    created_at: createdShipment.created_at,
    estimated_delivery_date: createdShipment.estimated_delivery_date,
  };
}
