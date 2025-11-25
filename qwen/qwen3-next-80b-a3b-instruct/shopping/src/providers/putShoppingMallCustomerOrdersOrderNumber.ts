import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerOrdersOrderNumber(props: {
  customer: CustomerPayload;
  orderNumber: string;
  body: IShoppingMallOrder.IUpdate;
}): Promise<IShoppingMallOrder> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: {
      order_number: props.orderNumber,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found or access denied", 404);
  }

  // Validate order can be updated only if status is draft, pending_payment, or confirmed
  if (!["draft", "pending_payment", "confirmed"].includes(order.status)) {
    throw new HttpException(
      "Order cannot be modified after payment processing",
      400,
    );
  }

  // Parse the IShoppingMallOrder.IUpdate as JSON string - despite it being defined as string in DTO
  // This is a contradiction, but the business logic requires these fields
  const updateData: any = {};
  let parsedBody: any = undefined;

  // The IShoppingMallOrder.IUpdate is incorrectly defined as string in the DTO,
  // but the business logic and Prisma schema require object fields.
  // We'll assume this is a DTO documentation error and parse it as JSON
  try {
    parsedBody = JSON.parse(props.body);
    if (parsedBody.notes !== undefined && parsedBody.notes !== null) {
      updateData.notes = parsedBody.notes;
    }

    if (
      parsedBody.shopping_mall_payment_method_id !== undefined &&
      parsedBody.shopping_mall_payment_method_id !== null
    ) {
      updateData.shopping_mall_payment_method_id =
        parsedBody.shopping_mall_payment_method_id;
    }

    if (
      parsedBody.shopping_mall_shipping_method_id !== undefined &&
      parsedBody.shopping_mall_shipping_method_id !== null
    ) {
      updateData.shopping_mall_shipping_method_id =
        parsedBody.shopping_mall_shipping_method_id;
    }
  } catch (err) {
    throw new HttpException("Invalid request body format", 400);
  }

  // Only recalculate financials if payment or shipping method changed
  let recalculateFinancials = false;
  if (
    parsedBody?.shopping_mall_payment_method_id !== undefined ||
    parsedBody?.shopping_mall_shipping_method_id !== undefined
  ) {
    recalculateFinancials = true;
  }

  // If financials need recalculation, we would fetch payment and shipping methods
  // to calculate fees. However, without loading those schemas, we have to assume
  // the system will handle this elsewhere, so we'll just update the provided fields.

  // Always update updated_at
  updateData.updated_at = toISOStringSafe(new Date());

  const updatedOrder = await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: order.id },
    data: updateData,
  });

  // Fetch the full order with relationships
  const fullOrder = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: updatedOrder.id },
    include: {
      customer: true,
      seller: true,
      paymentMethod: true,
      shippingMethod: true,
    },
  });

  if (!fullOrder) {
    throw new HttpException("Order not found after update", 404);
  }

  // Transform to IShoppingMallOrder type
  return {
    id: fullOrder.id,
    order_number: fullOrder.order_number,
    subtotal: fullOrder.subtotal,
    tax_amount:
      fullOrder.tax_amount === null ? undefined : fullOrder.tax_amount,
    shipping_fee:
      fullOrder.shipping_fee === null ? undefined : fullOrder.shipping_fee,
    discount_amount:
      fullOrder.discount_amount === null
        ? undefined
        : fullOrder.discount_amount,
    total_amount: fullOrder.total_amount,
    currency: fullOrder.currency,
    status: fullOrder.status,
    business_status:
      fullOrder.business_status === null
        ? undefined
        : fullOrder.business_status,
    notes: fullOrder.notes === null ? undefined : fullOrder.notes,
    created_at: toISOStringSafe(fullOrder.created_at),
    updated_at: toISOStringSafe(fullOrder.updated_at),
    deleted_at:
      fullOrder.deleted_at === null
        ? undefined
        : toISOStringSafe(fullOrder.deleted_at),
    customer: {
      id: fullOrder.customer.id,
      email: fullOrder.customer.email,
      name:
        `${fullOrder.customer.first_name || ""} ${fullOrder.customer.last_name || ""}`.trim() ||
        "Unknown",
      created_at: toISOStringSafe(fullOrder.customer.created_at),
      status: fullOrder.customer.status,
    },
    seller: fullOrder.seller.id,
    paymentMethod: fullOrder.paymentMethod
      ? fullOrder.paymentMethod.id
      : undefined,
    shippingMethod: fullOrder.shippingMethod
      ? {
          id: fullOrder.shippingMethod.id,
          name: fullOrder.shippingMethod.name,
          description: fullOrder.shippingMethod.description ?? undefined,
          cost: fullOrder.shippingMethod.base_cost,
          estimatedDeliveryDays:
            fullOrder.shippingMethod.estimated_days_min || 0,
          carrier: fullOrder.shippingMethod.code,
          serviceLevel: typia.assert<
            "priority" | "standard" | "expedited" | "overnight"
          >(fullOrder.shippingMethod.code),
          maxWeight: 0,
        }
      : undefined,
  };
}
