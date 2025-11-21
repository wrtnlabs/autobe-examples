import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerOrdersOrderId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrder> {
  try {
    // Find the order with customer and customerSession relationships
    const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
      where: {
        id: props.orderId,
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
      include: {
        customer: true,
        customerSession: true,
      },
    });

    if (!order) {
      throw new HttpException("Order not found", 404);
    }

    // Map the order to the DTO format with proper null/undefined handling
    return {
      id: order.id,
      order_number: order.order_number,
      total_amount: order.total_amount,
      subtotal_amount: order.subtotal_amount,
      tax_amount: order.tax_amount,
      shipping_amount: order.shipping_amount,
      currency: order.currency,
      status: order.status,
      shipping_address: order.shipping_address,
      billing_address: order.billing_address,
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
      deleted_at: order.deleted_at
        ? toISOStringSafe(order.deleted_at)
        : undefined,
      customer: {
        id: order.customer.id,
        email: order.customer.email,
        first_name: order.customer.first_name,
        last_name: order.customer.last_name,
        phone_number: order.customer.phone_number ?? undefined,
        status: order.customer.status,
        created_at: toISOStringSafe(order.customer.created_at),
        updated_at: order.customer.updated_at
          ? toISOStringSafe(order.customer.updated_at)
          : undefined,
      },
      customerSession: {
        id: order.customerSession.id,
        created_at: toISOStringSafe(order.customerSession.created_at),
      },
    };
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new HttpException("Internal server error", 500);
  }
}
