import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderItemSnapshotAtVariantOptionTransformer {
  export type Payload =
    Prisma.shopping_mall_order_item_snapshot_variant_optionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        option_key: true,
        option_value: true,
        created_at: true,
        snapshot: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_order_item_snapshotsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_order_item_snapshot_variant_optionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItemSnapshot.IVariantOption> {
    return {
      optionKey: input.option_key,
      optionValue: input.option_value,
    };
  }
}
