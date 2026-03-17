import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallInventoryRecordTransformer {
  export type Payload = Prisma.shopping_mall_inventory_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shopping_mall_product_variant_id: true,
        quantity: true,
        reason_type: true,
        note: true,
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_inventory_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallInventoryRecord> {
    return {
      id: input.id,
      variantId: input.shopping_mall_product_variant_id,
      quantity: input.quantity,
      reasonType: input.reason_type,
      note: input.note,
      createdAt: input.created_at.toISOString(),
    };
  }
}
