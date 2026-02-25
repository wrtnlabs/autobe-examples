import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallVariantStocks } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantStocks";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallVariantStocksAtAdjustmentTransformer {
  export type Payload = IShoppingMallVariantStocks.IAdjustment;
  export function select() {
    return {
      select: {},
    } satisfies Prisma.shopping_mall_variant_stocksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallVariantStocks.IAdjustment> {
    return {
      quantity: input.quantity,
      reason: input.reason,
    };
  }
}
