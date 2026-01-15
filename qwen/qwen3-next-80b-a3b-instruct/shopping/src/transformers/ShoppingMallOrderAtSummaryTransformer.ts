import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallCustomerAtSummaryTransformer } from "./ShoppingMallCustomerAtSummaryTransformer";
import { ShoppingMallOrderAddressAtSummaryTransformer } from "./ShoppingMallOrderAddressAtSummaryTransformer";
import { ShoppingMallPaymentMethodAtSummaryTransformer } from "./ShoppingMallPaymentMethodAtSummaryTransformer";

export namespace ShoppingMallOrderAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        currency: true,
        total_amount: true,
        shipping_cost: true,
        tax_amount: true,
        order_number: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        coupon_discount_code: true,
        notes: true,
        placed_from: true,
        // Reuse neighbor transformers for directly used relations
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
        shopping_mall_order_items: {
          select: {
            id: true,
          },
        },
        shopping_mall_order_addresses:
          ShoppingMallOrderAddressAtSummaryTransformer.select(),
        // Fix: Select payment and its payment method relation
        shopping_mall_order_payments: {
          select: {
            id: true,
            payment_method_id: false,
            status: true,
            amount: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            // Add relation to include payment method details
            payment_method:
              ShoppingMallPaymentMethodAtSummaryTransformer.select(),
          },
        },
        // Fix: Correct field name from 'event_type' to 'type'
        shopping_mall_order_events: {
          select: {
            id: true,
            event_type: true,
            created_at: true,
          },
        },
        shopping_mall_order_returns: {
          select: {
            id: true,
            status: true,
            created_at: true,
          },
        },
        shopping_mall_order_refunds: {
          select: {
            id: true,
            amount: true,
            created_at: true,
          },
        },
        shopping_mall_delivery_trackings: {
          select: {
            id: true,
            status: true,
            created_at: true,
          },
        },
        shopping_mall_order_shipments: {
          select: {
            id: true,
            tracking_number: true,
            carrier: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrder.ISummary> {
    // Get context for payment method
    const payment = input.shopping_mall_order_payments;
    return {
      id: input.id,
      orderNumber: input.order_number,
      status: input.status as IShoppingMallOrder.ISummary["status"],
      totalAmount:
        Number(input.total_amount) +
        Number(input.shipping_cost) +
        Number(input.tax_amount),
      customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      paymentMethod: payment?.payment_method
        ? await ShoppingMallPaymentMethodAtSummaryTransformer.transform(
            payment.payment_method,
          )
        : null,
      createdAt: toISOStringSafe(input.created_at),
      shippingAddress: input.shopping_mall_order_addresses
        ? await ShoppingMallOrderAddressAtSummaryTransformer.transform(
            input.shopping_mall_order_addresses,
          )
        : null,
      itemsCount: input.shopping_mall_order_items.length,
      isFulfilled: input.status === "shipped" || input.status === "delivered",
      isPaid:
        payment?.status === "captured" || payment?.status === "authorized",
    };
  }
}
