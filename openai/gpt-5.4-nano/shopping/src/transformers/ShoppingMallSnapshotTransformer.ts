import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
import { IShoppingMallSnapshotPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotPayload";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSnapshotPartyAtSummaryTransformer } from "./ShoppingMallSnapshotPartyAtSummaryTransformer";
import { ShoppingMallSnapshotPayloadTransformer } from "./ShoppingMallSnapshotPayloadTransformer";

export namespace ShoppingMallSnapshotTransformer {
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
        payload: ShoppingMallSnapshotPayloadTransformer.select(),
        snapshotParties: ShoppingMallSnapshotPartyAtSummaryTransformer.select(),
        sellerSnapshotOrderItems: true,
      },
    } satisfies Prisma.shopping_mall_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSnapshot> {
    return {
      id: input.id,
      snapshotCode: input.snapshot_code,
      sourceType: input.source_type,
      sourceEntityId: input.source_entity_id,
      sourceSellerId: input.source_seller_id,
      sourceOrderId: input.source_order_id,
      sourceOrderItemId: input.source_order_item_id,
      sourceReviewId: input.source_review_id,
      sourceCancellationRequestId: input.source_cancellation_request_id,
      sourceRefundRequestId: input.source_refund_request_id,
      createdByMemberId: input.created_by_member_id,
      reason: input.reason,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      payload: input.payload
        ? await ShoppingMallSnapshotPayloadTransformer.transform(input.payload)
        : null,
      parties: await ArrayUtil.asyncMap(
        input.snapshotParties,
        ShoppingMallSnapshotPartyAtSummaryTransformer.transform,
      ),
    };
  }
}
