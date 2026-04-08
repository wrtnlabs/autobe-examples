import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductVariantAtSummaryTransformer } from "./ShoppingMallProductVariantAtSummaryTransformer";

export namespace ShoppingMallInventoryRecordAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_inventory_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity_delta: true,
        reason: true,
        created_at: true,
        productVariant: ShoppingMallProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_inventory_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallInventoryRecord.ISummary> {
    return {
      id: input.id,
      quantity_delta: input.quantity_delta,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      productVariant:
        await ShoppingMallProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
    } satisfies IShoppingMallInventoryRecord.ISummary;
  }
}
