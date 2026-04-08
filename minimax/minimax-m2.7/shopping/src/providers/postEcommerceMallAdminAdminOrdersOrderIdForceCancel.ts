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

export async function postEcommerceMallAdminAdminOrdersOrderIdForceCancel(props: {
  admin: AdminPayload;
  orderId: string;
}): Promise<IEcommerceMallOrder> {
  // Step 1: Find order by order_number
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirstOrThrow({
    where: { order_number: props.orderId },
    select: { id: true, status: true },
  });
  // Step 2: Query order items with 'paid' status (eligible for cancellation)
  const eligibleItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: {
        ecommerce_mall_order_id: order.id,
        status: "paid",
      },
      select: {
        id: true,
        quantity: true,
        ecommerce_mall_product_variant_id: true,
      },
    });
  // Step 3: If no eligible items, return 400 error
  if (eligibleItems.length === 0) {
    throw new HttpException(
      "No eligible items to cancel. Only items with 'paid' status can be cancelled.",
      400,
    );
  }
  // Step 4: Use transaction for atomicity
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    // For each eligible item: cancel and restore stock
    for (const item of eligibleItems) {
      // Update order item status to 'cancelled'
      await tx.ecommerce_mall_order_items.update({
        where: { id: item.id },
        data: {
          status: "cancelled",
          updated_at: now,
        },
      });
      // Restore stock quantity via inventory record (refund inventory)
      await tx.ecommerce_mall_inventory_records.create({
        data: {
          id: v4(),
          ecommerce_mall_product_variant_id:
            item.ecommerce_mall_product_variant_id,
          quantity_change: item.quantity,
          reason: "order_cancellation",
          created_at: now,
        },
      });
    }
    // Step 5: Compute new order status based on all items
    const allItems = await tx.ecommerce_mall_order_items.findMany({
      where: { ecommerce_mall_order_id: order.id },
      select: { status: true },
    });
    const hasNonCancelled = allItems.some((i) => i.status !== "cancelled");
    const newOrderStatus = hasNonCancelled
      ? "partially_completed"
      : "cancelled";
    // Step 6: Update order status
    await tx.ecommerce_mall_orders.update({
      where: { id: order.id },
      data: {
        status: newOrderStatus,
        updated_at: now,
      },
    });
  });
  // Step 7: Fetch updated order with full data using transformer
  const updatedOrder =
    await MyGlobal.prisma.ecommerce_mall_orders.findFirstOrThrow({
      ...EcommerceMallOrderTransformer.select(),
      where: { order_number: props.orderId },
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
// export async function postEcommerceMallAdminAdminOrdersOrderIdForceCancel(props: {
//   admin: AdminPayload;
//   orderId: string;
// }): Promise<IEcommerceMallOrder> {
//   const record = await MyGlobal.prisma.ecommerce_mall_orders.findFirstOrThrow({
//     ...EcommerceMallOrderTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallOrderTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------