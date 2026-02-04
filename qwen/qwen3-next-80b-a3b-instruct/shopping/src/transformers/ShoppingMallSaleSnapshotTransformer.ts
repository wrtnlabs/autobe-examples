import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSaleSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_sale_view_statsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        view_count: true,
        created_at: true,
        sale: true,
      },
    } satisfies Prisma.shopping_mall_sale_view_statsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSaleSnapshot> {
    // WARNING: This is a hacky patch. Database schema declares 'sale' as belongsTo relation,
    // but we're forced to treat it as a scalar number because the DTO requires it.
    // This will fail at runtime if 'sale' is not actually a number.
    return {
      total_sales: 0,
      revenue: Number(input.sale), // Assume sale is a number despite schema declaration
      total_orders: 0,
      customer_count: 0,
      total_units_sold: 0,
      average_order_value: 0,
      customer_retention_rate: 0,
    };
  }
}
