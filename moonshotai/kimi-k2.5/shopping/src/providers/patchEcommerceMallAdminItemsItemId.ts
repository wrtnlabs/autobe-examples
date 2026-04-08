import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderItemTransformer } from "../transformers/EcommerceMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminItemsItemId(props: {
  admin: AdminPayload;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItem.IUpdate;
}): Promise<IEcommerceMallOrderItem> {
  // Find the order item with all relations
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...EcommerceMallOrderItemTransformer.select(),
    });
  // If status is being updated, validate and process the transition
  if (props.body.status !== undefined) {
    const currentStatus = orderItem.status;
    const newStatus = props.body.status;
    // Validate status transitions
    if (newStatus === "cancelled" && currentStatus !== "paid") {
      throw new HttpException("Only paid order items can be cancelled", 400);
    }
    if (newStatus === "refunded" && currentStatus !== "delivered") {
      throw new HttpException(
        "Only delivered order items can be refunded",
        400,
      );
    }
    // Only allow cancelled and refunded transitions through this endpoint
    if (newStatus !== "cancelled" && newStatus !== "refunded") {
      throw new HttpException(
        "Only status transitions to 'cancelled' or 'refunded' are allowed through this endpoint",
        400,
      );
    }
    // Perform atomic update with inventory restoration
    await MyGlobal.prisma.$transaction(async (prisma) => {
      // Create inventory record to restore stock
      const inventoryReason =
        newStatus === "cancelled" ? "order_cancelled" : "refund_processed";
      await prisma.ecommerce_mall_inventory_records.create({
        data: {
          id: v4(),
          product_variant_id: orderItem.variant_id,
          quantity_change: orderItem.quantity,
          reason: inventoryReason,
          created_at: new Date(),
        },
      });
      // Update order item status
      await prisma.ecommerce_mall_order_items.update({
        where: { id: props.itemId },
        data: {
          status: newStatus,
          updated_at: new Date(),
        },
      });
      // Update order derived status based on all items
      const allItems = await prisma.ecommerce_mall_order_items.findMany({
        where: { order_id: orderItem.order_id },
        select: { status: true },
      });
      const statuses = allItems.map((item) => item.status);
      const uniqueStatuses = [...new Set(statuses)];
      let derivedStatus: string;
      if (uniqueStatuses.length === 1) {
        // All items have the same status
        derivedStatus = uniqueStatuses[0];
      } else if (statuses.every((s) => s === "cancelled" || s === "refunded")) {
        // All items are either cancelled or refunded
        derivedStatus = uniqueStatuses.includes("cancelled")
          ? "cancelled"
          : "refunded";
      } else {
        // Mixed statuses
        derivedStatus = "partially_completed";
      }
      // Update order status
      await prisma.ecommerce_mall_orders.update({
        where: { id: orderItem.order_id },
        data: {
          status: derivedStatus,
          updated_at: new Date(),
        },
      });
    });
  }
  // Fetch and return the updated order item
  const updated =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...EcommerceMallOrderItemTransformer.select(),
    });
  return await EcommerceMallOrderItemTransformer.transform(updated);
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
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminItemsItemId(props: {
//   admin: AdminPayload;
//   itemId: string;
//   body: IEcommerceMallOrderItem.IUpdate;
// }): Promise<IEcommerceMallOrderItem> {
//   const record = await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
//     ...EcommerceMallOrderItemTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallOrderItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------