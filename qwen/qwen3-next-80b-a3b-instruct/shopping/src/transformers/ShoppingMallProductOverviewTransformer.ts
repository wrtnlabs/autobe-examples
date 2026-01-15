import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOverview";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductOverviewTransformer {
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
            id: true, // Only valid field we can select from the product relation
          },
        },
      },
    } satisfies Prisma.shopping_mall_product_sales_statsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductOverview> {
    return {
      total_sales: input.total_revenue,
      average_conversion_rate: input.conversion_rate,
      top_selling_product_id: input.product.id, // Accessing id from the selected product relation
      top_selling_product_sales: input.total_revenue,
    };
  }
}
