import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallOrderStatusAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusAnalytics";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderStatusAnalyticsTransformer {
  export type Payload = Prisma.shopping_mall_ordersGetPayload<
    ReturnType<typeof select>
  >[];
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
        customer: true,
        shopping_mall_order_items: true,
        shopping_mall_order_addresses: true,
        shopping_mall_order_payments: true,
        shopping_mall_order_events: true,
        shopping_mall_order_returns: true,
        shopping_mall_order_refunds: true,
        shopping_mall_delivery_trackings: true,
        shopping_mall_order_shipments: true,
      },
    } satisfies Prisma.shopping_mall_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderStatusAnalytics> {
    const counts = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
    };
    for (const order of input) {
      switch (order.status) {
        case "pending":
          counts.pending++;
          break;
        case "processing":
          counts.processing++;
          break;
        case "shipped":
          counts.shipped++;
          break;
        case "delivered":
          counts.delivered++;
          break;
        case "cancelled":
          counts.cancelled++;
          break;
        case "returned":
          counts.returned++;
          break;
      }
    }
    return counts;
  }
}
