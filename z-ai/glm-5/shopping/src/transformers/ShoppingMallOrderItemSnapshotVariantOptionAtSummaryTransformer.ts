import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderItemSnapshotVariantOptionAtSummaryTransformer {
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
      },
    } satisfies Prisma.shopping_mall_order_item_snapshot_variant_optionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItemSnapshotVariantOption.ISummary> {
    return {
      id: input.id,
      option_key: input.option_key,
      option_value: input.option_value,
    };
  }
}
