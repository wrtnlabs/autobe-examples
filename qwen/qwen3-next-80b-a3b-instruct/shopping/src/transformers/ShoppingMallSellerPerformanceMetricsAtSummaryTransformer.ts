import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallSellerPerformanceMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceMetrics";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerPerformanceMetricsAtSummaryTransformer {
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
  ): Promise<IShoppingMallSellerPerformanceMetrics.ISummary> {
    return {
      total_sales_volume: input.rating_avg,
      average_order_value: input.response_time_avg,
      customer_review_rating: input.fulfillment_rate,
      return_rate: 0,
      order_fulfillment_speed_hours: input.fulfillment_rate,
      seller_response_rate: input.response_time_avg,
      total_product_listings: input.feedback_count,
      total_active_variants: input.feedback_count,
      customer_conversion_rate: input.feedback_count,
      repeating_customer_rate: input.feedback_count,
      total_positive_reviews: input.feedback_count,
      total_negative_reviews: input.feedback_count,
      total_order_cancellations: input.disputes_count,
      total_product_views: input.feedback_count,
      total_inquiries_received: input.feedback_count,
      total_wishlist_additions: input.feedback_count,
      total_complaints: 0,
      total_shipping_delays: 0,
      total_refund_requests: 0,
      total_product_reviews_received: input.feedback_count,
      seller_compliance_score: 0,
      seller_performance_score: 0,
      record_date: input.updated_at.toISOString(),
    };
  }
}
