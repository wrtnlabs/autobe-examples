import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function postShoppingMallBuyerOrdersOrderIdPaymentTransactions(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallPaymentTransaction.ICreate;
}): Promise<IShoppingMallPaymentTransaction> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      shopping_mall_buyer_id: props.buyer.id,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found or access denied", 404);
  }

  if (props.body.payment_method_id) {
    const paymentMethod =
      await MyGlobal.prisma.shopping_mall_payment_methods.findFirst({
        where: {
          id: props.body.payment_method_id,
          shopping_mall_buyer_id: props.buyer.id,
          deleted_at: null,
        },
      });

    if (!paymentMethod) {
      throw new HttpException("Payment method not found or access denied", 404);
    }

    if (!paymentMethod.is_verified) {
      throw new HttpException("Payment method is not verified", 400);
    }
  }

  if (props.body.amount !== order.total_amount) {
    throw new HttpException("Payment amount does not match order total", 400);
  }

  const created =
    await MyGlobal.prisma.shopping_mall_payment_transactions.create({
      data: {
        id: v4(),
        shopping_mall_order_id: props.orderId,
        shopping_mall_buyer_id: props.buyer.id,
        shopping_mall_payment_method_id: props.body.payment_method_id ?? null,
        transaction_type: props.body.transaction_type,
        amount: props.body.amount,
        currency: props.body.currency,
        status: props.body.status,
        provider: props.body.provider,
        provider_transaction_id: props.body.provider_transaction_id ?? null,
        provider_response: props.body.provider_response ?? null,
        failure_reason: props.body.failure_reason ?? null,
        failure_code: props.body.failure_code ?? null,
        ip_address: props.body.ip_address ?? null,
        user_agent: props.body.user_agent ?? null,
        created_at: new Date(),
      },
      include: {
        order: true,
        buyer: true,
        paymentMethod: true,
      },
    });

  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    order: created.order
      ? {
          id: created.order.id,
          order_number: created.order.order_number,
          status: created.order.status satisfies string as string,
          subtotal: created.order.subtotal,
          shipping_total: created.order.shipping_total,
          tax_total: created.order.tax_total,
          discount_total: created.order.discount_total,
          total_amount: created.order.total_amount,
          estimated_delivery_start: created.order.estimated_delivery_start
            ? toISOStringSafe(created.order.estimated_delivery_start)
            : null,
          estimated_delivery_end: created.order.estimated_delivery_end
            ? toISOStringSafe(created.order.estimated_delivery_end)
            : null,
          actual_delivery_at: created.order.actual_delivery_at
            ? toISOStringSafe(created.order.actual_delivery_at)
            : null,
          cancelled_at: created.order.cancelled_at
            ? toISOStringSafe(created.order.cancelled_at)
            : null,
          completed_at: created.order.completed_at
            ? toISOStringSafe(created.order.completed_at)
            : null,
          created_at: toISOStringSafe(created.order.created_at),
          updated_at: toISOStringSafe(created.order.updated_at),
        }
      : undefined,
    shopping_mall_buyer_id: created.shopping_mall_buyer_id,
    buyer: created.buyer
      ? {
          id: created.buyer.id,
          email: created.buyer.email,
          full_name: created.buyer.full_name,
          phone_number: created.buyer.phone_number ?? null,
        }
      : undefined,
    shopping_mall_payment_method_id:
      created.shopping_mall_payment_method_id ?? null,
    paymentMethod: created.paymentMethod
      ? {
          id: created.paymentMethod.id,
          payment_type: typia.assert<
            | "credit_card"
            | "debit_card"
            | "paypal"
            | "apple_pay"
            | "google_pay"
            | "bank_transfer"
          >(created.paymentMethod.payment_type),
          provider: typia.assert<
            "stripe" | "paypal" | "square" | "adyen" | "braintree"
          >(created.paymentMethod.provider),
          last_four_digits: created.paymentMethod.last_four_digits ?? null,
          card_brand: created.paymentMethod.card_brand ?? null,
          billing_name: created.paymentMethod.billing_name,
          billing_postal_code:
            created.paymentMethod.billing_postal_code ?? null,
          expiry_month: created.paymentMethod.expiry_month ?? null,
          expiry_year: created.paymentMethod.expiry_year ?? null,
          is_default: created.paymentMethod.is_default,
          is_verified: created.paymentMethod.is_verified,
          created_at: toISOStringSafe(created.paymentMethod.created_at),
          updated_at: toISOStringSafe(created.paymentMethod.updated_at),
        }
      : null,
    transaction_type: created.transaction_type satisfies string as string,
    amount: created.amount,
    currency: created.currency satisfies string as string,
    status: created.status satisfies string as string,
    provider: created.provider satisfies string as string,
    provider_transaction_id: created.provider_transaction_id ?? null,
    provider_response: created.provider_response ?? null,
    failure_reason: created.failure_reason ?? null,
    failure_code: created.failure_code ?? null,
    ip_address: created.ip_address ?? null,
    user_agent: created.user_agent ?? null,
    created_at: toISOStringSafe(created.created_at),
  };
}
