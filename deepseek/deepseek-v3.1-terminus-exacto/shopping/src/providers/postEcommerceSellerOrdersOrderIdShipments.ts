import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceShipmentCollector } from "../collectors/EcommerceShipmentCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceShipmentTransformer } from "../transformers/EcommerceShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceSellerOrdersOrderIdShipments(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceShipment.ICreate;
}): Promise<IEcommerceShipment> {
  // Validate order existence
  const order = await MyGlobal.prisma.ecommerce_orders.findUnique({
    where: { id: props.orderId, deleted_at: null },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  // Verify seller has items in this order with 'paid' status
  const orderItems = await MyGlobal.prisma.ecommerce_order_items.findMany({
    where: {
      order_id: props.orderId,
      seller: { id: props.seller.id },
      status: "paid",
    },
    select: { id: true },
  });
  if (orderItems.length === 0) {
    throw new HttpException("No order items found ready for shipment", 404);
  }
  // Check tracking number uniqueness
  const existingShipment = await MyGlobal.prisma.ecommerce_shipments.findUnique(
    {
      where: { tracking_number: props.body.tracking_number },
    },
  );
  if (existingShipment) {
    throw new HttpException("Tracking number already exists", 400);
  }
  // Create shipment with associated items in transaction
  const shipment = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create shipment record
    const shipment = await tx.ecommerce_shipments.create({
      data: await EcommerceShipmentCollector.collect({
        body: props.body,
        seller: { id: props.seller.id },
      }),
      ...EcommerceShipmentTransformer.select(),
    });
    // Create shipment-item mappings
    await tx.ecommerce_shipment_items.createMany({
      data: orderItems.map((item) => ({
        id: v4(),
        ecommerce_shipment_id: shipment.id,
        ecommerce_order_item_id: item.id,
        created_at: new Date(),
      })),
    });
    // Update order item statuses to 'shipped'
    await tx.ecommerce_order_items.updateMany({
      where: { id: { in: orderItems.map((item) => item.id) } },
      data: { status: "shipped" },
    });
    return shipment;
  });
  return await EcommerceShipmentTransformer.transform(shipment);
}
