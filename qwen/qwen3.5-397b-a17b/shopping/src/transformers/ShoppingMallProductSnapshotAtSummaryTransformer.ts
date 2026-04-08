import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCategoryAtSummaryTransformer } from "./ShoppingMallCategoryAtSummaryTransformer";

export namespace ShoppingMallProductSnapshotAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        product: { select: { id: true } },
        category: ShoppingMallCategoryAtSummaryTransformer.select(),
        productVariantSnapshots: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_product_variant_snapshotsFindManyArgs,
        images: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_product_snapshot_imagesFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshot.ISummary> {
    return {
      id: input.id,
      name: input.name,
      base_price: input.base_price,
      category: await ShoppingMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      created_at: input.created_at.toISOString(),
    } satisfies IShoppingMallProductSnapshot.ISummary;
  }
}
