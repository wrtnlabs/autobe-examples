import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallInventoryRecordAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_inventory_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity_change: true,
        remaining_quantity: true,
        reason: true,
        type: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        variant: true,
        order: true,
        cancellationRequest: true,
        refundRequest: true,
        snapshots: true,
      },
    } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallInventoryRecord.ISummary> {
    return {
      id: input.id,
      variant_id: input.variant.id,
      quantity_change: input.quantity_change,
      remaining_quantity: input.remaining_quantity,
      reason: input.reason,
      type: input.type,
      description: input.description ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      ecommerce_mall_order_id: input.order?.id ?? null,
      ecommerce_mall_cancellation_request_id:
        input.cancellationRequest?.id ?? null,
      ecommerce_mall_refund_request_id: input.refundRequest?.id ?? null,
    } satisfies IEcommerceMallInventoryRecord.ISummary;
  }
}
