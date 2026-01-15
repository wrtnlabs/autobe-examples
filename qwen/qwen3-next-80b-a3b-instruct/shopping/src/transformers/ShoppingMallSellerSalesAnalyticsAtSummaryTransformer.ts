import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallSellerSalesAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSalesAnalytics";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerSalesAnalyticsAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_product_sales_statsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        total_revenue: true,
        units_sold: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        conversion_rate: true,
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_product_sales_statsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerSalesAnalytics.ISummary> {
    return {
      seller_id: input.id,
      total_sales_revenue: Number(input.total_revenue),
      total_units_sold: input.units_sold,
      first_sale_date: input.created_at.toISOString(),
      last_sale_date: input.updated_at.toISOString(),
      total_completed_orders: 0,
      average_order_value: 0,
      product_count: 0,
      rating_average: 0,
      review_count: 0,
      customer_count: 0,
      active_duration_days: Math.floor(
        (input.updated_at.getTime() - input.created_at.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    };
  }
}
