import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallSellerPerformanceAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceAnalytics";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerPerformanceAnalyticsTransformer {
  export type Payload =
    Prisma.shopping_mall_seller_performance_metricsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        rating_avg: true,
        response_time_avg: true,
        fulfillment_rate: true,
        disputes_count: true,
        feedback_count: true,
        created_at: true,
        updated_at: true,
        seller: true,
      },
    } satisfies Prisma.shopping_mall_seller_performance_metricsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerPerformanceAnalytics> {
    return {
      seller_id: input.id,
      total_sales: 0,
      total_orders: 0,
      sell_through_rate: 0,
      average_rating: input.rating_avg,
      order_fulfillment_rate: input.fulfillment_rate,
      return_rate: 0,
      customer_retention_rate: 0,
      inventory_turnover_ratio: 0,
      performance_score: 0,
      active_listings: 0,
      review_count: input.feedback_count,
      last_updated: input.updated_at.toISOString(),
    };
  }
}
