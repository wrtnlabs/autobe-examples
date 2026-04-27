import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import { IECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ECommerceMallShipmentTransformer } from "../transformers/ECommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putECommerceMallCustomerShipmentsShipmentId(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IECommerceMallShipment.IUpdate;
}): Promise<IECommerceMallShipment> {
  // Step 1: Lookup shipment with shipment items
  const shipment = await MyGlobal.prisma.e_commerce_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: {
      id: true,
      shipped_at: true,
      delivered_at: true,
      shipmentItems: {
        select: {
          id: true,
          order_item_id: true,
        },
      },
    },
  });
  // Step 2: Validate shipment exists → 404
  if (shipment === null) {
    throw new HttpException("Shipment not found", 404);
  }
  // Step 3: Validate shipment belongs to authenticated customer → 403
  const orderItemIds: Array<string & tags.Format<"uuid">> =
    shipment.shipmentItems.map(
      (si) => si.order_item_id as string & tags.Format<"uuid">,
    );
  if (orderItemIds.length > 0) {
    const matchingCount =
      await MyGlobal.prisma.e_commerce_mall_order_items.count({
        where: {
          id: { in: orderItemIds },
          order: {
            e_commerce_mall_customer_id: props.customer.id,
          },
        },
      });
    if (matchingCount !== orderItemIds.length) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Step 4: Validate shipment has been dispatched (shipped_at is set) → 422
  if (shipment.shipped_at === null) {
    throw new HttpException("Shipment has not been dispatched yet", 422);
  }
  // Step 5: Validate shipment not already delivered → 409
  if (shipment.delivered_at !== null) {
    throw new HttpException("Shipment already delivered", 409);
  }
  // Step 6: Validate shipment has at least one item → 422
  if (shipment.shipmentItems.length === 0) {
    throw new HttpException("Shipment has no items", 422);
  }
  // Step 7: Transaction to atomically update shipment and order items
  await MyGlobal.prisma.$transaction(async (tx) => {
    const now: string & tags.Format<"date-time"> =
      new Date().toISOString() as string & tags.Format<"date-time">;
    // Update shipment: set delivered_at and updated_at
    await tx.e_commerce_mall_shipments.update({
      where: { id: props.shipmentId },
      data: {
        delivered_at: now,
        updated_at: now,
      },
    });
    // For each linked order item, transition to delivered if applicable
    for (const si of shipment.shipmentItems) {
      const orderItem = await tx.e_commerce_mall_order_items.findUnique({
        where: { id: si.order_item_id },
        select: { id: true, status: true },
      });
      if (orderItem === null) {
        continue;
      }
      // Skip items already in terminal states (cancelled, refunded) or already delivered
      if (
        orderItem.status === "cancelled" ||
        orderItem.status === "refunded" ||
        orderItem.status === "delivered"
      ) {
        continue;
      }
      // Get the current status as from_status before updating
      const fromStatus: string = orderItem.status;
      // Update order item status to delivered
      await tx.e_commerce_mall_order_items.update({
        where: { id: si.order_item_id },
        data: {
          status: "delivered",
          updated_at: now,
        },
      });
      // Insert status log entry for audit trail
      await tx.e_commerce_mall_order_item_status_logs.create({
        data: {
          id: v4(),
          e_commerce_mall_order_item_id: si.order_item_id,
          from_status: fromStatus,
          to_status: "delivered",
          reason: "customer_delivery_confirmation",
          created_at: now,
          updated_at: now,
        },
      });
    }
  });
  // Step 8: Return the updated shipment with all relations
  const updated =
    await MyGlobal.prisma.e_commerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...ECommerceMallShipmentTransformer.select(),
    });
  return await ECommerceMallShipmentTransformer.transform(updated);
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
// import { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipmentItem";
// import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
// import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// import { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
// import { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putECommerceMallCustomerShipmentsShipmentId(props: {
//   customer: CustomerPayload;
//   shipmentId: string & tags.Format<"uuid">;
//   body: IECommerceMallShipment.IUpdate;
// }): Promise<IECommerceMallShipment> {
//   await MyGlobal.prisma.e_commerce_mall_shipments.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.e_commerce_mall_shipments.findUniqueOrThrow({
//     where: { ... },
//     ...ECommerceMallShipmentTransformer.select(),
//   });
//   return await ECommerceMallShipmentTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------