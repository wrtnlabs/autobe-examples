import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminOrdersOrderIdPaymentsPaymentId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  paymentId: string & tags.Format<"uuid">;
  body: IShoppingMallPayment.IUpdate;
}): Promise<IShoppingMallPayment> {
  // Verify payment exists and belongs to the specified order
  const existingPayment =
    await MyGlobal.prisma.shopping_mall_payments.findFirst({
      where: {
        id: props.paymentId,
        shopping_mall_order_id: props.orderId,
      },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
      },
    });

  if (!existingPayment) {
    throw new HttpException(
      "Payment not found or does not belong to the specified order",
      404,
    );
  }

  // Update the payment with only provided fields
  const updatedPayment = await MyGlobal.prisma.shopping_mall_payments.update({
    where: { id: props.paymentId },
    data: {
      ...(props.body.payment_method !== undefined && {
        payment_method: props.body.payment_method,
      }),
      ...(props.body.payment_gateway !== undefined && {
        payment_gateway: props.body.payment_gateway,
      }),
      ...(props.body.transaction_id !== undefined && {
        transaction_id: props.body.transaction_id,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.authorization_code !== undefined && {
        authorization_code: props.body.authorization_code,
      }),
      ...(props.body.captured_at !== undefined && {
        captured_at: props.body.captured_at,
      }),
      ...(props.body.refunded_amount !== undefined && {
        refunded_amount: props.body.refunded_amount,
      }),
      ...(props.body.payment_details !== undefined && {
        payment_details: props.body.payment_details,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
    include: {
      order: {
        include: {
          customer: true,
        },
      },
    },
  });

  // Convert to response DTO with proper null/undefined handling
  return {
    id: updatedPayment.id,
    payment_method: updatedPayment.payment_method as
      | "credit_card"
      | "paypal"
      | "bank_transfer"
      | "digital_wallet",
    payment_gateway: updatedPayment.payment_gateway,
    transaction_id: updatedPayment.transaction_id,
    amount: updatedPayment.amount,
    currency: updatedPayment.currency,
    status: updatedPayment.status as
      | "pending"
      | "authorized"
      | "captured"
      | "declined"
      | "refunded"
      | "disputed"
      | "chargeback",
    authorization_code:
      updatedPayment.authorization_code === null
        ? undefined
        : updatedPayment.authorization_code,
    captured_at:
      updatedPayment.captured_at === null
        ? undefined
        : toISOStringSafe(updatedPayment.captured_at),
    refunded_amount:
      updatedPayment.refunded_amount === null
        ? undefined
        : updatedPayment.refunded_amount,
    payment_details:
      updatedPayment.payment_details === null
        ? undefined
        : updatedPayment.payment_details,
    created_at: toISOStringSafe(updatedPayment.created_at),
    updated_at: toISOStringSafe(updatedPayment.updated_at),
    order: {
      id: updatedPayment.order.id,
      order_number: updatedPayment.order.order_number,
      total_amount: updatedPayment.order.total_amount,
      subtotal_amount: updatedPayment.order.subtotal_amount,
      tax_amount: updatedPayment.order.tax_amount,
      shipping_amount: updatedPayment.order.shipping_amount,
      currency: updatedPayment.order.currency,
      status: updatedPayment.order.status,
      shipping_address: updatedPayment.order.shipping_address,
      billing_address: updatedPayment.order.billing_address,
      created_at: toISOStringSafe(updatedPayment.order.created_at),
      updated_at: toISOStringSafe(updatedPayment.order.updated_at),
      customer: {
        id: updatedPayment.order.customer.id,
        email: updatedPayment.order.customer.email,
        first_name: updatedPayment.order.customer.first_name,
        last_name: updatedPayment.order.customer.last_name,
        phone_number:
          updatedPayment.order.customer.phone_number === null
            ? undefined
            : updatedPayment.order.customer.phone_number,
        status: updatedPayment.order.customer.status,
        created_at: toISOStringSafe(updatedPayment.order.customer.created_at),
        updated_at:
          updatedPayment.order.customer.updated_at === null
            ? undefined
            : toISOStringSafe(updatedPayment.order.customer.updated_at),
      },
    },
  };
}
