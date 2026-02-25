import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallInventoryLogAtAdjustTransformer {
  export type Payload = Prisma.shopping_mall_inventory_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        change_quantity: true,
        reason: true,
        reference_id: true,
        notes: true,
        created_at: true,
        updated_at: true,
        variant: true,
      },
    } satisfies Prisma.shopping_mall_inventory_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallInventoryLog.IAdjust> {
    const reasonMap: Record<string, "adjustment" | "loss"> = {
      adjustment: "adjustment",
      loss: "loss",
    };
    const mappedReason = reasonMap[input.reason] ?? "adjustment";
    return {
      quantity: input.change_quantity,
      reason: mappedReason,
    };
  }
}
