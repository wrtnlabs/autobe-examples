import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductOptionValueAtSummaryTransformer } from "./ShoppingMallProductOptionValueAtSummaryTransformer";

export namespace ShoppingMallProductVariantSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.shopping_mall_product_variant_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        price_override: true,
        created_at: true,
        variant: true,
        optionValues: {
          select: {
            optionValue:
              ShoppingMallProductOptionValueAtSummaryTransformer.select(),
          },
        } satisfies Prisma.shopping_mall_product_variant_snapshot_optionsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_product_variant_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariantSnapshot.ISummary> {
    return {
      id: input.id,
      sku_code: input.sku_code,
      price_override: input.price_override,
      created_at: input.created_at.toISOString(),
      optionValues: await ArrayUtil.asyncMap(input.optionValues, (ov) =>
        ShoppingMallProductOptionValueAtSummaryTransformer.transform(
          ov.optionValue,
        ),
      ),
    };
  }
}
