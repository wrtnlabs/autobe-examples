import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallSellerPerformanceMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceMetrics";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerPerformanceMetricsTransformer {
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
  ): Promise<IShoppingMallSellerPerformanceMetrics> {
    return {
      customer_satisfaction_score: Number(input.rating_avg),
      response_time_average: Number(input.response_time_avg),
      fulfillment_rate: Number(input.fulfillment_rate),
      // These fields cannot be mapped from current schema - source data does not exist
      sales_volume: 0,
      return_rate: 0,
    };
  }
}
