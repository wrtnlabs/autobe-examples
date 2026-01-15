import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallCustomerAtSummaryTransformer } from "./ShoppingMallCustomerAtSummaryTransformer";

export namespace ShoppingMallOrderTransformer {
  export type Payload = Prisma.shopping_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        // All scalar fields from shopping_mall_orders
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
        // Relations
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
        shopping_mall_order_items: {
          select: {
            id: true,
            product_id: true,
            variant_id: true,
            quantity: true,
            unit_price: true,
            total_price: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        shopping_mall_order_addresses: {
          select: {
            id: true,
            address_type: true,
            first_name: true,
            last_name: true,
            company: true,
            address_1: true,
            address_2: true,
            city: true,
            state: true,
            postal_code: true,
            country: true,
            phone: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        shopping_mall_order_payments: {
          select: {
            id: true,
            payment_method: true,
            status: true,
            amount: true,
            currency: true,
            transaction_id: true,
            receipt_url: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        shopping_mall_order_events: {
          select: {
            id: true,
            event_type: true,
            status: true,
            notes: true,
            created_by: true,
            created_at: true,
          },
        },
        shopping_mall_order_returns: {
          select: {
            id: true,
            reason: true,
            status: true,
            requested_by: true,
            created_at: true,
            updated_at: true,
            processed_at: true,
          },
        },
        shopping_mall_order_refunds: {
          select: {
            id: true,
            payment_id: true,
            amount: true,
            currency: true,
            status: true,
            reason: true,
            created_at: true,
            updated_at: true,
          },
        },
        shopping_mall_delivery_trackings: {
          select: {
            id: true,
            carrier: true,
            tracking_url: true,
            status: true,
            estimated_delivery: true,
            actual_delivery: true,
            created_at: true,
            updated_at: true,
          },
        },
        shopping_mall_order_shipments: {
          select: {
            id: true,
            tracking_number: true,
            status: true,
            carrier: true,
            shipping_method: true,
            shipping_date: true,
            delivered_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_ordersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IShoppingMallOrder> {
    const shippingAddress = input.shopping_mall_order_addresses?.find(
      (a) => a.address_type === "shipping",
    );
    const billingAddress = input.shopping_mall_order_addresses?.find(
      (a) => a.address_type === "billing",
    );
    const payment = input.shopping_mall_order_payments?.[0];
    const shipment = input.shopping_mall_order_shipments?.[0];
    return {
      id: input.id,
      orderCode: input.order_number,
      status: input.status satisfies string as
        | "completed"
        | "pending_payment"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded",
      totalAmount: Number(input.total_amount),
      currency: input.currency satisfies string as "USD",
      shipping_address_id: shippingAddress?.id ?? null,
      billing_address_id: billingAddress?.id ?? null,
      shipping_method_id: payment?.payment_method ?? null,
      shipping_tracking_number: shipment?.tracking_number ?? undefined,
      notes: input.notes ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
    };
  }
}
