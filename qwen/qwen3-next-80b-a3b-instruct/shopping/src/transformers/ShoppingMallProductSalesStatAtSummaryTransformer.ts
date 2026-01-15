import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductSalesStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSalesStat";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductSalesStatAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_product_sales_statsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        units_sold: true,
        total_revenue: true,
        conversion_rate: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: {
          select: {
            inventory_level: true,
            status: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_product_sales_statsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSalesStat.ISummary> {
    return {
      sales_volume: input.units_sold,
      revenue: input.total_revenue,
      view_count: input.product?.view_count ?? 0,
      inventory_level: input.product.inventory_level,
      stock_status: input.product.status as
        | "in_stock"
        | "low_stock"
        | "out_of_stock"
        | "backordered",
    };
  }
}
