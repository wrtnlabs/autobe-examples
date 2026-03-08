import { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
        old_status: true,
        new_status: true,
        change_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: true,
        cancellationRequest: true,
        refundRequest: true,
        changedBySeller: true,
      },
    } satisfies Prisma.ecommerce_mall_order_item_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItemSnapshot.ISummary> {
    return {
      id: input.id,
      old_status: input.old_status,
      new_status: input.new_status,
      change_reason: input.change_reason ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at?.toISOString() ?? undefined,
      deleted_at: input.deleted_at?.toISOString() ?? null,
      cancellation_request_id: input.cancellationRequest?.id ?? undefined,
      refund_request_id: input.refundRequest?.id ?? undefined,
      changed_by_seller_id: input.changedBySeller.id,
    };
  }
}
