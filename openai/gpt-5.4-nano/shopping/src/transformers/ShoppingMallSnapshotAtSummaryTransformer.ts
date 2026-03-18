import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSnapshotAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_code: true,
        source_type: true,
        source_entity_id: true,
        source_seller_id: true,
        source_order_id: true,
        source_order_item_id: true,
        source_review_id: true,
        source_cancellation_request_id: true,
        source_refund_request_id: true,
        created_by_member_id: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        snapshotParties: true,
        payload: true,
        sellerSnapshotOrderItems: true,
      },
    } satisfies Prisma.shopping_mall_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSnapshot.ISummary> {
    return {
      id: input.id,
      snapshot_code: input.snapshot_code,
      source_type: input.source_type,
      source_entity_id: input.source_entity_id,
      source_seller_id: input.source_seller_id ?? null,
      source_order_id: input.source_order_id ?? null,
      source_order_item_id: input.source_order_item_id ?? null,
      source_review_id: input.source_review_id ?? null,
      source_cancellation_request_id:
        input.source_cancellation_request_id ?? null,
      source_refund_request_id: input.source_refund_request_id ?? null,
      created_by_member_id: input.created_by_member_id ?? null,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
