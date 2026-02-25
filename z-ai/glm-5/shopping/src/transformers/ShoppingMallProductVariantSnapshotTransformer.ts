import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductVariantSnapshotTransformer {
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
        optionValues: {
          select: {
            option_key: true,
            option_value: true,
          },
        } satisfies Prisma.shopping_mall_product_variant_snapshot_option_valuesFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_product_variant_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariantSnapshot> {
    return {
      id: input.id,
      skuCode: input.sku_code,
      priceOverride: input.price_override,
      optionValues: JSON.stringify(
        input.optionValues.map((ov) => ({
          key: ov.option_key,
          value: ov.option_value,
        })),
      ),
      createdAt: input.created_at.toISOString(),
    };
  }
}
