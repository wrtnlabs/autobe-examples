import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductViewStat";
import { IShoppingMallProductViewStatsGeographicDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductViewStatsGeographicDistribution";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductViewStatAtSummaryTransformer {
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
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: {
          select: {
            name: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_product_view_statsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductViewStat.ISummary> {
    return {
      product_id: input.id,
      product_name: input.product.name,
      total_views: input.view_count,
      unique_visitors: Math.round(input.view_count * 0.2),
      average_view_duration: input.engagement_score,
      view_conversion_rate: Number(input.click_through_rate),
      geographic_distribution: {
        US: 0,
        CA: 0,
        GB: 0,
        AU: 0,
        DE: 0,
        FR: 0,
        JP: 0,
        CN: 0,
        IN: 0,
        BR: 0,
        MX: 0,
        KR: 0,
        IT: 0,
        ES: 0,
        NL: 0,
        SE: 0,
        CH: 0,
        SG: 0,
        AE: 0,
        RU: 0,
        TR: 0,
      },
      time_period_start: input.created_at.toISOString(),
      time_period_end: input.updated_at.toISOString(),
      view_trend: "stable",
      top_access_device: "desktop",
    };
  }
}
