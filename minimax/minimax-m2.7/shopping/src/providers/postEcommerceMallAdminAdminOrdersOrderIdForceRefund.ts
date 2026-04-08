import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderTransformer } from "../transformers/EcommerceMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminAdminOrdersOrderIdForceRefund(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrder.IForceRefund;
}): Promise<IEcommerceMallOrder> {
  // Retrieve the order to verify it exists
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUnique({
    where: { id: props.orderId },
    select: {
      id: true,
      status: true,
    },
  });
  if (order === null) {
    throw new HttpException("Order not found", 404);
  }
  // Fetch all order items eligible for refund (status: paid, shipped, or delivered)
  const eligibleItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: {
        ecommerce_mall_order_id: props.orderId,
        status: { in: ["paid", "shipped", "delivered"] },
      },
      select: {
        id: true,
        ecommerce_mall_product_variant_id: true,
        quantity: true,
        status: true,
      },
    });
  if (eligibleItems.length === 0) {
    throw new HttpException(
      "No items eligible for refund. All items may already be cancelled or refunded.",
      400,
    );
  }
  // Use transaction for atomicity - all operations succeed or all fail
  await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date();
    // Update each eligible order item to 'refunded' and create inventory records
    for (const item of eligibleItems) {
      // Update order item status
      await tx.ecommerce_mall_order_items.update({
        where: { id: item.id },
        data: {
          status: "refunded",
          updated_at: now,
        },
      });
      // Create inventory record to restore stock (positive quantity_change adds back to inventory)
      await tx.ecommerce_mall_inventory_records.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          ecommerce_mall_product_variant_id:
            item.ecommerce_mall_product_variant_id,
          quantity_change: item.quantity,
          reason: "refund",
          created_at: now,
        },
      });
    }
    // Check all items to determine new order status
    const remainingItems = await tx.ecommerce_mall_order_items.findMany({
      where: { ecommerce_mall_order_id: props.orderId },
      select: { status: true },
    });
    // Order is 'refunded' if all items are refunded or cancelled
    const allResolved =
      remainingItems.length > 0 &&
      remainingItems.every(
        (item) => item.status === "refunded" || item.status === "cancelled",
      );
    const newOrderStatus = allResolved ? "refunded" : "partially_completed";
    // Update order status
    await tx.ecommerce_mall_orders.update({
      where: { id: props.orderId },
      data: {
        status: newOrderStatus,
        updated_at: now,
      },
    });
  });
  // Fetch updated order with all relations for response
  const updatedOrder =
    await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
      where: { id: props.orderId },
      ...EcommerceMallOrderTransformer.select(),
    });
  return await EcommerceMallOrderTransformer.transform(updatedOrder);
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
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
// import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
// import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
// import { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
// import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAdminAdminOrdersOrderIdForceRefund(props: {
//   admin: AdminPayload;
//   orderId: string & tags.Format<"uuid">;
//   body: IEcommerceMallOrder.IForceRefund;
// }): Promise<IEcommerceMallOrder> {
//   const record = await MyGlobal.prisma.ecommerce_mall_orders.findFirstOrThrow({
//     ...EcommerceMallOrderTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallOrderTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------