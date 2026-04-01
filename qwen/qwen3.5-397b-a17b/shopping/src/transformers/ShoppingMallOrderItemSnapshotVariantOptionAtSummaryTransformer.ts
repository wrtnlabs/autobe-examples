import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
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
        created_at: true,
        orderItemSnapshot: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_order_item_snapshotsFindManyArgs,
        productOptionValue: {
          select: {
            name: true,
            optionDefinition: {
              select: {
                name: true,
              },
            },
          },
        } satisfies Prisma.shopping_mall_product_option_valuesFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_order_item_snapshot_variant_optionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItemSnapshotVariantOption.ISummary> {
    return {
      id: input.id,
      optionName: input.productOptionValue.optionDefinition.name,
      optionValue: input.productOptionValue.name,
      createdAt: toISOStringSafe(input.created_at),
    };
  }
}
