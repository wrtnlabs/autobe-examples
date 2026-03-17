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
import { ShoppingMallProductVariantSnapshotOptionValueTransformer } from "./ShoppingMallProductVariantSnapshotOptionValueTransformer";

export namespace ShoppingMallProductVariantSnapshotTransformer {
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariantSnapshot> {
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
      sku_code: input.productVariant.sku_code,
      option_summary: input.productVariant.option_summary,
      price: input.productVariant.price,
      change_summary: input.change_summary,
      created_at: input.created_at.toISOString(),
      optionValues: await ArrayUtil.asyncMap(
        input.optionValues,
        ShoppingMallProductVariantSnapshotOptionValueTransformer.transform,
      ),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        productVariant: ShoppingMallProductVariantAtSummaryTransformer.select(),
        productSnapshot:
          ShoppingMallProductSnapshotAtSummaryTransformer.select(),
        change_summary: true,
        created_at: true,
        optionValues:
          ShoppingMallProductVariantSnapshotOptionValueTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_product_variant_snapshotsFindManyArgs;
  }
  export type Payload =
    Prisma.shopping_mall_product_variant_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
}
