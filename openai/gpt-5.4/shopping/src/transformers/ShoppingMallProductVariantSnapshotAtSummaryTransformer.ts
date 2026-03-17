import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshotOptionValue";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductSnapshotAtSummaryTransformer } from "./ShoppingMallProductSnapshotAtSummaryTransformer";
import { ShoppingMallProductVariantAtSummaryTransformer } from "./ShoppingMallProductVariantAtSummaryTransformer";
import { ShoppingMallProductVariantSnapshotOptionValueAtSummaryTransformer } from "./ShoppingMallProductVariantSnapshotOptionValueAtSummaryTransformer";

export namespace ShoppingMallProductVariantSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.shopping_mall_product_variant_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        change_summary: true,
        created_at: true,
        productVariant: ShoppingMallProductVariantAtSummaryTransformer.select(),
        productSnapshot:
          ShoppingMallProductSnapshotAtSummaryTransformer.select(),
        optionValues:
          ShoppingMallProductVariantSnapshotOptionValueAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_product_variant_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariantSnapshot.ISummary> {
    return {
      id: input.id,
      productVariant:
        await ShoppingMallProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      productSnapshot: input.productSnapshot
        ? await ShoppingMallProductSnapshotAtSummaryTransformer.transform(
            input.productSnapshot,
          )
        : null,
      skuCode: input.productVariant.sku_code,
      price: input.productVariant.price,
      changeSummary: input.change_summary,
      optionValues: await ArrayUtil.asyncMap(
        input.optionValues,
        ShoppingMallProductVariantSnapshotOptionValueAtSummaryTransformer.transform,
      ),
      createdAt: input.created_at.toISOString(),
    };
  }
}
