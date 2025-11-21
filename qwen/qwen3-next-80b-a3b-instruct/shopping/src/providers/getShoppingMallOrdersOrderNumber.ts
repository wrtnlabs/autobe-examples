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
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

export async function getShoppingMallOrdersOrderNumber(props: {
  orderNumber: string;
}): Promise<IShoppingMallOrder> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: {
      order_number: props.orderNumber,
      deleted_at: null,
    },
    include: {
      customer: true,
      seller: true,
      paymentMethod: true,
      shippingMethod: true,
    },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  return {
    id: order.id,
    order_number: order.order_number,
    subtotal: order.subtotal,
    tax_amount: order.tax_amount ?? undefined,
    shipping_fee: order.shipping_fee ?? undefined,
    discount_amount: order.discount_amount ?? undefined,
    total_amount: order.total_amount,
    currency: order.currency,
    status: order.status,
    business_status: order.business_status ?? undefined,
    notes: order.notes ?? undefined,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    deleted_at: order.deleted_at
      ? toISOStringSafe(order.deleted_at)
      : undefined,
    customer: {
      id: order.customer.id,
      email: order.customer.email,
      name: order.customer.first_name + " " + order.customer.last_name,
      created_at: toISOStringSafe(order.customer.created_at),
      status: order.customer.status,
    },
    seller: order.seller.id,
    paymentMethod: order.paymentMethod ? order.paymentMethod.id : undefined,
    shippingMethod: order.shippingMethod
      ? {
          id: order.shippingMethod.id,
          name: order.shippingMethod.name,
          description: order.shippingMethod.description ?? undefined,
          cost: order.shippingMethod.base_cost,
          estimatedDeliveryDays:
            (order.shippingMethod.estimated_days_min +
              order.shippingMethod.estimated_days_max) /
            2,
          carrier: order.shippingMethod.code,
          serviceLevel: typia.assert<
            "priority" | "standard" | "expedited" | "overnight"
          >(order.shippingMethod.code),
          maxWeight: order.shippingMethod.estimated_days_max,
        }
      : undefined,
  };
}
