import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSaleAtSummaryTransformer } from "./ShoppingMallSaleAtSummaryTransformer";

export namespace ShoppingMallSaleUnitAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_sale_unitsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        option_values: true,
        price_override: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sale: ShoppingMallSaleAtSummaryTransformer.select(),
        saleUnitSnapshots: {
          select: {},
        } satisfies Prisma.shopping_mall_sale_unit_snapshotsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_sale_unitsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSaleUnit.ISummary> {
    return {
      id: input.id,
      skuCode: input.sku_code,
      optionValues: input.option_values,
      priceOverride: input.price_override ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      sale: await ShoppingMallSaleAtSummaryTransformer.transform(input.sale),
    };
  }
}
