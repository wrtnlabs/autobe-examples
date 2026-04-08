import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteEcommerceMallSellerShipmentsShipmentId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Query shipment with shipment items and order item statuses
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: {
      id: true,
      ecommerce_mall_seller_id: true,
      deleted_at: true,
      shipmentItems: {
        select: {
          orderItem: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
    },
  });
  // Verify shipment exists
  if (shipment === null) {
    throw new HttpException("Shipment not found", 404);
  }
  // Verify shipment is not already deleted
  if (shipment.deleted_at !== null) {
    throw new HttpException("Shipment already deleted", 400);
  }
  // Verify seller owns this shipment
  if (shipment.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if any order items have 'delivered' status - cannot delete if so
  const hasDeliveredItems = shipment.shipmentItems.some(
    (item) => item.orderItem.status === "delivered",
  );
  if (hasDeliveredItems) {
    throw new HttpException("Cannot delete shipment with delivered items", 400);
  }
  // Extract order item IDs for status update
  const orderItemIds = shipment.shipmentItems.map((item) => item.orderItem.id);
  // Use transaction to atomically update order items and soft delete shipment
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_mall_order_items.updateMany({
      where: { id: { in: orderItemIds } },
      data: { status: "paid" },
    }),
    MyGlobal.prisma.ecommerce_mall_shipments.update({
      where: { id: props.shipmentId },
      data: { deleted_at: new Date() },
    }),
  ]);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteEcommerceMallSellerShipmentsShipmentId(props: {
//   seller: SellerPayload;
//   shipmentId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------