import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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

export async function postEcommerceMallAdminAdminOrdersOrderIdItemsItemIdForceRefund(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItem.IForceRefund;
}): Promise<IEcommerceMallOrderItem> {
  // Find the order item with all necessary relations
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      ...EcommerceMallOrderItemTransformer.select(),
      where: {
        id: props.itemId,
        ecommerce_mall_order_id: props.orderId,
      },
    });
  // Validate item is eligible for refund - only delivered items can be force-refunded
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Order item can only be force-refunded when status is delivered",
      400,
    );
  }
  // Update order item status to refunded
  await MyGlobal.prisma.ecommerce_mall_order_items.update({
    where: { id: props.itemId },
    data: {
      status: "refunded",
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Create inventory record to restore stock (positive quantity_change)
  const inventoryRecordId = v4();
  await MyGlobal.prisma.ecommerce_mall_inventory_records.create({
    data: {
      id: inventoryRecordId,
      ecommerce_mall_product_variant_id: orderItem.productVariant.id,
      quantity_change: orderItem.quantity,
      reason: "force_refund",
      created_at: toISOStringSafe(new Date()),
    },
  });
  // Recalculate overall order status
  const allOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: { ecommerce_mall_order_id: props.orderId },
      select: { status: true },
    });
  // Determine new order status based on all item statuses
  const hasAnyRefunded = allOrderItems.some(
    (item) => item.status === "refunded",
  );
  const allRefunded = allOrderItems.every((item) => item.status === "refunded");
  const allCancelled = allOrderItems.every(
    (item) => item.status === "cancelled",
  );
  let newOrderStatus: string;
  if (allCancelled) {
    newOrderStatus = "cancelled";
  } else if (allRefunded) {
    newOrderStatus = "refunded";
  } else if (hasAnyRefunded) {
    newOrderStatus = "partially_completed";
  } else {
    const hasShipped = allOrderItems.some((item) => item.status === "shipped");
    const hasDelivered = allOrderItems.some(
      (item) => item.status === "delivered",
    );
    if (hasShipped && !hasDelivered) {
      newOrderStatus = "shipped";
    } else if (hasDelivered) {
      newOrderStatus = "delivered";
    } else {
      newOrderStatus = "paid";
    }
  }
  // Update order status
  await MyGlobal.prisma.ecommerce_mall_orders.update({
    where: { id: props.orderId },
    data: { status: newOrderStatus },
  });
  // Return updated order item
  const updatedItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      ...EcommerceMallOrderItemTransformer.select(),
      where: {
        id: props.itemId,
        ecommerce_mall_order_id: props.orderId,
      },
    });
  return await EcommerceMallOrderItemTransformer.transform(updatedItem);
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
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAdminAdminOrdersOrderIdItemsItemIdForceRefund(props: {
//   admin: AdminPayload;
//   orderId: string & tags.Format<"uuid">;
//   itemId: string & tags.Format<"uuid">;
//   body: IEcommerceMallOrderItem.IForceRefund;
// }): Promise<IEcommerceMallOrderItem> {
//   const record = await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
//     ...EcommerceMallOrderItemTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallOrderItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------