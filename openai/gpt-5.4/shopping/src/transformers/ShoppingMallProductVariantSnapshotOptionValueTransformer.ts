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
import { ShoppingMallProductVariantSnapshotAtSummaryTransformer } from "./ShoppingMallProductVariantSnapshotAtSummaryTransformer";

export namespace ShoppingMallProductVariantSnapshotOptionValueTransformer {
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariantSnapshotOptionValue> {
    return {
      id: input.id,
      productVariantSnapshot:
        await ShoppingMallProductVariantSnapshotAtSummaryTransformer.transform(
          input.productVariantSnapshot,
        ),
      name: input.name,
      value: input.value,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        productVariantSnapshot:
          ShoppingMallProductVariantSnapshotAtSummaryTransformer.select(),
        name: true,
        value: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_product_variant_snapshot_option_valuesFindManyArgs;
  }
  export type Payload =
    Prisma.shopping_mall_product_variant_snapshot_option_valuesGetPayload<
      ReturnType<typeof select>
    >;
}
