import { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IJsonObject } from "@ORGANIZATION/PROJECT-api/lib/structures/IJsonObject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallOrderItemSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_order_item_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_type: true,
        created_at: true,
        previous_values: true,
        current_values: true,
        orderItem: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
        changedBy: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_adminsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_order_item_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItemSnapshot.ISummary> {
    return {
      id: input.id,
      order_item_id: input.orderItem.id,
      snapshot_type: input.snapshot_type as
        | "purchase"
        | "status_change"
        | "cancellation"
        | "refund",
      created_at: input.created_at.toISOString(),
      previous_values: input.previous_values
        ? JSON.parse(input.previous_values)
        : null,
      current_values: JSON.parse(input.current_values),
      changed_by_id: input.changedBy?.id ?? null,
    };
  }
}
