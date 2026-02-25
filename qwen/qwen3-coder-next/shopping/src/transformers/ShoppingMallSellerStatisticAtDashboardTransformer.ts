import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerStatistic";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerStatisticAtDashboardTransformer {
  export type Payload = Prisma.shopping_mall_seller_statisticsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        total_products: true,
        total_order_items: true,
        pending_cancellation_requests: true,
        pending_refund_requests: true,
        average_rating: true,
        total_reviews: true,
        total_sales_revenue: true,
        pending_seller_approvals: true,
        pending_shipments: true,
        last_calculated_at: true,
        seller: true,
      },
    } satisfies Prisma.shopping_mall_seller_statisticsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerStatistic.IDashboard> {
    return {
      total_products: input.total_products,
      total_order_items: input.total_order_items,
      pending_cancellation_requests: input.pending_cancellation_requests,
      pending_refund_requests: input.pending_refund_requests,
      average_rating: input.average_rating ?? undefined,
      total_reviews: input.total_reviews,
      total_sales_revenue: input.total_sales_revenue,
      pending_seller_approvals: input.pending_seller_approvals,
      pending_shipments: input.pending_shipments,
      last_calculated_at: input.last_calculated_at.toISOString(),
    };
  }
}
