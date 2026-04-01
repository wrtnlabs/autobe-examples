import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariant";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductSnapshotAtSummaryTransformer } from "./ShoppingMallProductSnapshotAtSummaryTransformer";

export namespace ShoppingMallProductSnapshotVariantAtSummaryTransformer {
  export type Payload =
    Prisma.shopping_mall_product_snapshot_variantsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        price_override: true,
        stock_quantity: true,
        created_at: true,
        snapshot: ShoppingMallProductSnapshotAtSummaryTransformer.select(),
        snapshotVariantOptions: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_product_snapshot_variant_optionsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_product_snapshot_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshotVariant.ISummary> {
    return {
      id: input.id,
      sku_code: input.sku_code,
      price_override: input.price_override,
      stock_quantity: input.stock_quantity,
      created_at: input.created_at.toISOString(),
      snapshot: await ShoppingMallProductSnapshotAtSummaryTransformer.transform(
        input.snapshot,
      ),
    };
  }
}
