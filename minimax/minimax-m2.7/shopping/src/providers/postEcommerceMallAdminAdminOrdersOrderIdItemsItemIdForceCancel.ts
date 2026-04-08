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

export async function postEcommerceMallAdminAdminOrdersOrderIdItemsItemIdForceCancel(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallOrderItem> {
  // Step 1: Validate order exists
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true },
  });
  // Step 2: Validate order item exists and belongs to order
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      where: {
        id: props.itemId,
        ecommerce_mall_order_id: props.orderId,
      },
      select: {
        id: true,
        quantity: true,
        status: true,
        ecommerce_mall_product_variant_id: true,
      },
    });
  // Step 3: Verify order item status is not already cancelled or refunded
  if (orderItem.status === "cancelled") {
    throw new HttpException("Order item is already cancelled", 400);
  }
  if (orderItem.status === "refunded") {
    throw new HttpException("Order item is already refunded", 400);
  }
  // Step 4: Create inventory record for restocking
  await MyGlobal.prisma.ecommerce_mall_inventory_records.create({
    data: {
      id: v4(),
      quantity_change: orderItem.quantity,
      reason: "order_cancellation",
      ecommerce_mall_product_variant_id:
        orderItem.ecommerce_mall_product_variant_id,
      created_at: new Date(),
    },
  });
  // Step 5: Update order item status to cancelled
  await MyGlobal.prisma.ecommerce_mall_order_items.update({
    where: { id: props.itemId },
    data: {
      status: "cancelled",
      updated_at: new Date(),
    },
  });
  // Step 6: Check all order items - if all cancelled/refunded, update order status
  const allItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: { ecommerce_mall_order_id: props.orderId },
    select: { status: true },
  });
  const allTerminated = allItems.every(
    (item) => item.status === "cancelled" || item.status === "refunded",
  );
  if (allTerminated) {
    await MyGlobal.prisma.ecommerce_mall_orders.update({
      where: { id: props.orderId },
      data: {
        status: "cancelled",
      },
    });
  }
  // Step 7: Return updated order item with full details
  const updatedItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...EcommerceMallOrderItemTransformer.select(),
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
// export async function postEcommerceMallAdminAdminOrdersOrderIdItemsItemIdForceCancel(props: {
//   admin: AdminPayload;
//   orderId: string & tags.Format<"uuid">;
//   itemId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallOrderItem> {
//   const record = await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
//     ...EcommerceMallOrderItemTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallOrderItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------