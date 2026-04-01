import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductOptionValueAtSummaryTransformer } from "./ShoppingMallProductOptionValueAtSummaryTransformer";

export namespace ShoppingMallOrderItemSnapshotVariantOptionTransformer {
  export type Payload =
    Prisma.shopping_mall_order_item_snapshot_variant_optionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        orderItemSnapshot: true,
        productOptionValue:
          ShoppingMallProductOptionValueAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_order_item_snapshot_variant_optionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItemSnapshotVariantOption> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      productOptionValue:
        await ShoppingMallProductOptionValueAtSummaryTransformer.transform(
          input.productOptionValue,
        ),
    };
  }
}
