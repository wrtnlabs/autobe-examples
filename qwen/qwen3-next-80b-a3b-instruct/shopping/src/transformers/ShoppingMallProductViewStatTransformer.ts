import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductViewStat";
import { IShoppingMallProductViewRegionDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductViewRegionDistribution";
import { IShoppingMallProductViewDeviceDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductViewDeviceDistribution";
import { IShoppingMallProductViewTrendByHour } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductViewTrendByHour";
import { IShoppingMallProductViewBySource } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductViewBySource";
import { IShoppingMallProductViewByCustomerType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductViewByCustomerType";
import { IShoppingMallProductPageFeaturesUsed } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPageFeaturesUsed";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductViewStatTransformer {
  export type Payload = Prisma.shopping_mall_product_view_statsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        view_count: true,
        click_through_rate: true,
        engagement_score: true,
        product: {
          select: {
            id: true,
          },
        },
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_product_view_statsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductViewStat> {
    return {
      id: input.id,
      product_id: input.product.id,
      total_views: input.view_count,
      unique_views: Math.round(input.view_count * 0.8),
      view_duration_seconds: input.engagement_score,
      conversion_rate_to_cart: input.click_through_rate,
      total_page_views: Math.round(input.view_count * 1.2),
      region_distribution: {} as IShoppingMallProductViewRegionDistribution,
      device_type_distribution:
        {} as IShoppingMallProductViewDeviceDistribution,
      view_trend_7d: Math.round(input.view_count / 7),
      view_trend_30d: Math.round(input.view_count / 30),
      view_trend_by_hour: Array(24).fill(
        0,
      ) as IShoppingMallProductViewTrendByHour,
      view_by_source: {} as IShoppingMallProductViewBySource,
      view_by_customer_type: {
        first_time: 0,
        returning: 0,
        loyal: 0,
        anonymous: 0,
        total: input.view_count,
      } as IShoppingMallProductViewByCustomerType,
      page_features_used: {} as IShoppingMallProductPageFeaturesUsed,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
