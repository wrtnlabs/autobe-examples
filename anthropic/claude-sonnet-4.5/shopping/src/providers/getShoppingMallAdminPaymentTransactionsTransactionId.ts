import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminPaymentTransactionsTransactionId(props: {
  admin: AdminPayload;
  transactionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPaymentTransaction> {
  const transaction =
    await MyGlobal.prisma.shopping_mall_payment_transactions.findUnique({
      where: { id: props.transactionId },
    });

  if (!transaction) {
    throw new HttpException("Payment transaction not found", 404);
  }

  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: transaction.shopping_mall_order_id },
  });

  const buyer = await MyGlobal.prisma.shopping_mall_buyers.findUnique({
    where: { id: transaction.shopping_mall_buyer_id },
  });

  const paymentMethod = transaction.shopping_mall_payment_method_id
    ? await MyGlobal.prisma.shopping_mall_payment_methods.findUnique({
        where: { id: transaction.shopping_mall_payment_method_id },
      })
    : null;

  return {
    id: transaction.id,
    shopping_mall_order_id: transaction.shopping_mall_order_id,
    order: order
      ? {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          subtotal: Number(order.subtotal),
          shipping_total: Number(order.shipping_total),
          tax_total: Number(order.tax_total),
          discount_total: Number(order.discount_total),
          total_amount: Number(order.total_amount),
          estimated_delivery_start: order.estimated_delivery_start
            ? toISOStringSafe(order.estimated_delivery_start)
            : null,
          estimated_delivery_end: order.estimated_delivery_end
            ? toISOStringSafe(order.estimated_delivery_end)
            : null,
          actual_delivery_at: order.actual_delivery_at
            ? toISOStringSafe(order.actual_delivery_at)
            : null,
          cancelled_at: order.cancelled_at
            ? toISOStringSafe(order.cancelled_at)
            : null,
          completed_at: order.completed_at
            ? toISOStringSafe(order.completed_at)
            : null,
          created_at: toISOStringSafe(order.created_at),
          updated_at: toISOStringSafe(order.updated_at),
        }
      : undefined,
    shopping_mall_buyer_id: transaction.shopping_mall_buyer_id,
    buyer: buyer
      ? {
          id: buyer.id,
          email: buyer.email,
          full_name: buyer.full_name,
          phone_number: buyer.phone_number,
        }
      : undefined,
    shopping_mall_payment_method_id:
      transaction.shopping_mall_payment_method_id ?? null,
    paymentMethod: paymentMethod
      ? {
          id: paymentMethod.id,
          payment_type: typia.assert<
            | "credit_card"
            | "debit_card"
            | "paypal"
            | "apple_pay"
            | "google_pay"
            | "bank_transfer"
          >(paymentMethod.payment_type),
          provider: paymentMethod.provider,
          last_four_digits: paymentMethod.last_four_digits,
          card_brand: paymentMethod.card_brand,
          billing_name: paymentMethod.billing_name,
          billing_postal_code: paymentMethod.billing_postal_code,
          expiry_month: paymentMethod.expiry_month,
          expiry_year: paymentMethod.expiry_year,
          is_default: paymentMethod.is_default,
          is_verified: paymentMethod.is_verified,
          created_at: toISOStringSafe(paymentMethod.created_at),
          updated_at: toISOStringSafe(paymentMethod.updated_at),
        }
      : null,
    transaction_type: transaction.transaction_type,
    amount: Number(transaction.amount),
    currency: transaction.currency,
    status: transaction.status,
    provider: transaction.provider,
    provider_transaction_id: transaction.provider_transaction_id,
    provider_response: transaction.provider_response,
    failure_reason: transaction.failure_reason,
    failure_code: transaction.failure_code,
    ip_address: transaction.ip_address,
    user_agent: transaction.user_agent,
    created_at: toISOStringSafe(transaction.created_at),
  };
}
