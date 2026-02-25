import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemStatusLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderItemStatusLogTransformer {
  export type Payload = Prisma.shopping_mall_order_item_status_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        from_status: true,
        to_status: true,
        changed_by: true,
        shopping_mall_order_item_id: true,
        changed_by_id: true,
        notes: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_order_item_status_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItemStatusLog> {
    return {
      id: input.id,
      from_status: input.from_status ?? undefined,
      to_status: input.to_status,
      changed_by: input.changed_by,
      shopping_mall_order_item_id: input.orderItem.id,
      changed_by_id: input.changed_by_id ?? undefined,
      notes: input.notes ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
