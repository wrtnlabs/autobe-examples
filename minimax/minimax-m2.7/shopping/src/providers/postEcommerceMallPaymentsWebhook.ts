import { IEcommerceMallPaymentWebhook } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPaymentWebhook";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallPaymentsWebhook(props: {
  body: IEcommerceMallPaymentWebhook.IRequest;
}): Promise<void> {
  // Helper to create branded UUID type
  const toUuid = (value: string): string & tags.Format<"uuid"> => {
    return value as string & tags.Format<"uuid">;
  };
  // Helper to create branded datetime string
  const toDateTimeString = (date: Date): string & tags.Format<"date-time"> => {
    return date.toISOString() as string & tags.Format<"date-time">;
  };
  // Order status mapping based on payment gateway status
  const ORDER_STATUS_MAP: Record<string, string> = {
    success: "paid",
    captured: "paid",
    failed: "payment_failed",
    declined: "payment_failed",
    refunded: "refunded",
  };
  const newOrderStatus = ORDER_STATUS_MAP[props.body.status];
  if (!newOrderStatus) {
    throw new Error(`Unknown payment status: ${props.body.status}`);
  }
  // Look up the order by order_reference (order_number)
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUnique({
    where: { order_number: props.body.orderReference },
    select: {
      id: true,
      order_number: true,
      status: true,
      ecommerce_mall_customer_id: true,
      orderItems: {
        select: {
          id: true,
          ecommerce_mall_product_variant_id: true,
          quantity: true,
          status: true,
        },
      },
    },
  });
  if (!order) {
    throw new Error("Order not found");
  }
  const now = new Date();
  const nowString = toDateTimeString(now);
  // Update order status to reflect payment result
  await MyGlobal.prisma.ecommerce_mall_orders.update({
    where: { id: order.id },
    data: {
      status: newOrderStatus,
      updated_at: now,
    },
  });
  // Handle refund: restore inventory for each order item
  if (props.body.status === "refunded") {
    const refundPromises = order.orderItems.map((item) =>
      MyGlobal.prisma.$transaction([
        MyGlobal.prisma.ecommerce_mall_inventory_records.create({
          data: {
            id: toUuid(v4()),
            ecommerce_mall_product_variant_id: toUuid(
              item.ecommerce_mall_product_variant_id,
            ),
            quantity_change: item.quantity,
            reason: "refund",
            created_at: now,
          },
        }),
        MyGlobal.prisma.ecommerce_mall_product_variants.update({
          where: { id: item.ecommerce_mall_product_variant_id },
          data: {
            quantity: {
              increment: item.quantity,
            },
            updated_at: now,
          },
        }),
      ]),
    );
    await Promise.all(refundPromises);
  }
  // Log the webhook event for audit purposes
  const webhookDetails = {
    transactionId: props.body.transactionId,
    orderReference: props.body.orderReference,
    status: props.body.status,
    amount: props.body.amount,
    currency: props.body.currency,
    gateway: props.body.gateway ?? null,
    metadata: props.body.metadata ?? null,
    customerEmail: props.body.customerEmail ?? null,
    timestamp: props.body.timestamp,
    previousStatus: order.status,
    newStatus: newOrderStatus,
  };
  await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.create({
    data: {
      id: toUuid(v4()),
      ecommerce_mall_admin_id: toUuid("00000000-0000-0000-0000-000000000000"),
      action: `payment_webhook_${props.body.status}`,
      resource_type: "order",
      resource_id: toUuid(order.id),
      details: JSON.stringify(webhookDetails),
      ip_address: "0.0.0.0",
      user_agent: null,
      created_at: now,
    },
  });
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
// import { IEcommerceMallPaymentWebhook } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPaymentWebhook";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallPaymentsWebhook(props: {
//   body: IEcommerceMallPaymentWebhook.IRequest;
// }): Promise<void> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------