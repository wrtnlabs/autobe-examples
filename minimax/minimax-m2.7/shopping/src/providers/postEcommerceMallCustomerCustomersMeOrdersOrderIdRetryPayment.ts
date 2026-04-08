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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderTransformer } from "../transformers/EcommerceMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCustomersMeOrdersOrderIdRetryPayment(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallOrder> {
  // 1. Find order with full relations for response
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirst({
    ...EcommerceMallOrderTransformer.select(),
    where: {
      id: props.orderId,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  // 2. Verify order ownership via customer relation
  if (order.customer?.id !== props.customer.id) {
    throw new HttpException("Order not found", 404);
  }
  // 3. Check order status allows payment retry
  const retryEligibleStatuses = ["pending_payment", "payment_failed"];
  if (!retryEligibleStatuses.includes(order.status)) {
    throw new HttpException(
      `Payment retry is not allowed for orders with status '${order.status}'`,
      400,
    );
  }
  // 4. Process payment with payment gateway (simulated with retry)
  const paymentResult = await processPaymentWithRetry(props.orderId);
  if (!paymentResult.success) {
    throw new HttpException(
      paymentResult.errorMessage ??
        "Payment failed. Please try again or use a different payment method.",
      402,
    );
  }
  // 5. On payment success, atomically update order and inventory
  const currentTimestamp = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update order status to 'paid'
    await tx.ecommerce_mall_orders.update({
      where: { id: props.orderId },
      data: {
        status: "paid",
        updated_at: currentTimestamp,
      },
    });
    // Get all order items for inventory processing
    const orderItems = await tx.ecommerce_mall_order_items.findMany({
      where: { ecommerce_mall_order_id: props.orderId },
      select: {
        ecommerce_mall_product_variant_id: true,
        quantity: true,
      },
    });
    // Process each order item for inventory
    for (const item of orderItems) {
      // Decrement variant quantity
      await tx.ecommerce_mall_product_variants.update({
        where: { id: item.ecommerce_mall_product_variant_id },
        data: {
          quantity: { decrement: item.quantity },
          updated_at: currentTimestamp,
        },
      });
      // Create inventory record for audit trail
      await tx.ecommerce_mall_inventory_records.create({
        data: {
          id: v4(),
          ecommerce_mall_product_variant_id:
            item.ecommerce_mall_product_variant_id,
          quantity_change: -item.quantity,
          reason: "order_placement",
          created_at: currentTimestamp,
        },
      });
    }
    // Clear purchased items from customer's cart
    const cart = await tx.ecommerce_mall_carts.findFirst({
      where: { ecommerce_mall_customer_id: props.customer.id },
      select: { id: true },
    });
    if (cart) {
      const variantIds = orderItems.map(
        (item) => item.ecommerce_mall_product_variant_id,
      );
      await tx.ecommerce_mall_cart_items.deleteMany({
        where: {
          ecommerce_mall_cart_id: cart.id,
          ecommerce_mall_product_variant_id: { in: variantIds },
        },
      });
    }
  });
  // 6. Fetch updated order with all relations for response
  const updatedOrder =
    await MyGlobal.prisma.ecommerce_mall_orders.findFirstOrThrow({
      ...EcommerceMallOrderTransformer.select(),
      where: { id: props.orderId },
    });
  // 7. Return transformed order
  return await EcommerceMallOrderTransformer.transform(updatedOrder);
}
async function processPaymentWithRetry(
  orderId: string & tags.Format<"uuid">,
): Promise<{
  success: boolean;
  errorMessage?: string;
}> {
  const maxRetries = 3;
  let lastErrorMessage: string | undefined;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await callPaymentGateway(orderId);
    if (result.success) {
      return { success: true };
    }
    lastErrorMessage = result.errorMessage;
    // Exponential backoff: 2s, 4s
    if (attempt < maxRetries) {
      const delayMs = Math.pow(2, attempt) * 1000;
      await sleep(delayMs);
    }
  }
  return {
    success: false,
    errorMessage:
      lastErrorMessage ?? "Payment processing failed after multiple attempts",
  };
}
async function callPaymentGateway(
  _orderId: string & tags.Format<"uuid">,
): Promise<{
  success: boolean;
  errorMessage?: string;
}> {
  // Simulate network latency
  const latencyMs = 100 + Math.floor(Math.random() * 200);
  await sleep(latencyMs);
  // Simulate 80% success rate for demonstration
  const isSuccess = Math.random() < 0.8;
  if (isSuccess) {
    return { success: true };
  }
  const errorMessages = [
    "Insufficient funds",
    "Card declined",
    "Network error",
    "Gateway timeout",
  ];
  const randomIndex = Math.floor(Math.random() * errorMessages.length);
  return {
    success: false,
    errorMessage: errorMessages[randomIndex],
  };
}
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
// export async function postEcommerceMallCustomerCustomersMeOrdersOrderIdRetryPayment(props: {
//   customer: CustomerPayload;
//   orderId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallOrder> {
//   const record = await MyGlobal.prisma.ecommerce_mall_orders.findFirstOrThrow({
//     ...EcommerceMallOrderTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallOrderTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------