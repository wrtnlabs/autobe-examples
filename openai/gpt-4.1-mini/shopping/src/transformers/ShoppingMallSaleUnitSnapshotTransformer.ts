import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSaleSnapshotAtSummaryTransformer } from "./ShoppingMallSaleSnapshotAtSummaryTransformer";
import { ShoppingMallSaleUnitAtSummaryTransformer } from "./ShoppingMallSaleUnitAtSummaryTransformer";

export namespace ShoppingMallSaleUnitSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_sale_unit_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shopping_mall_sale_unit_id: true,
        shopping_mall_sale_snapshot_id: true,
        sku_code: true,
        option_values: true,
        price_override: true,
        stock_quantity: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        saleUnit: ShoppingMallSaleUnitAtSummaryTransformer.select(),
        saleSnapshot: ShoppingMallSaleSnapshotAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_sale_unit_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSaleUnitSnapshot> {
    return {
      id: input.id,
      shoppingMallSaleUnitId: input.shopping_mall_sale_unit_id,
      shoppingMallSaleSnapshotId: input.shopping_mall_sale_snapshot_id,
      skuCode: input.sku_code,
      optionValues: input.option_values,
      priceOverride: input.price_override ?? null,
      stockQuantity: input.stock_quantity,
      isActive: input.is_active,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      saleUnit: await ShoppingMallSaleUnitAtSummaryTransformer.transform(
        input.saleUnit,
      ),
      saleSnapshot:
        await ShoppingMallSaleSnapshotAtSummaryTransformer.transform(
          input.saleSnapshot,
        ),
    };
  }
}
