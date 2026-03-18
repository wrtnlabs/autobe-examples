import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
import { IShoppingMallSnapshotPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotPayload";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSnapshot> {
  const viewableParty =
    await MyGlobal.prisma.shopping_mall_snapshot_parties.findFirst({
      where: {
        shopping_mall_snapshot_id: props.snapshotId,
        party_type: "admin",
        party_id: props.admin.id,
        can_view: true,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (viewableParty === null) {
    throw new HttpException("Not Found", 404);
  }
  const snapshot =
    await MyGlobal.prisma.shopping_mall_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
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
        payload: {
          select: {
            id: true,
            shopping_mall_snapshot_id: true,
            payload: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        snapshotParties: {
          select: {
            id: true,
            shopping_mall_snapshot_id: true,
            party_type: true,
            party_id: true,
            can_view: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        sellerSnapshotOrderItems: true,
      },
    });
  const safeCreatedAt = toISOStringSafe(snapshot.created_at) satisfies string &
    tags.Format<"date-time">;
  const safeUpdatedAt = toISOStringSafe(snapshot.updated_at) satisfies string &
    tags.Format<"date-time">;
  return {
    id: snapshot.id,
    snapshotCode: snapshot.snapshot_code,
    sourceType: snapshot.source_type,
    sourceEntityId: snapshot.source_entity_id,
    sourceSellerId: snapshot.source_seller_id,
    sourceOrderId: snapshot.source_order_id,
    sourceOrderItemId: snapshot.source_order_item_id,
    sourceReviewId: snapshot.source_review_id,
    sourceCancellationRequestId: snapshot.source_cancellation_request_id,
    sourceRefundRequestId: snapshot.source_refund_request_id,
    createdByMemberId: snapshot.created_by_member_id,
    reason: snapshot.reason,
    createdAt: safeCreatedAt,
    updatedAt: safeUpdatedAt,
    deletedAt:
      snapshot.deleted_at === null
        ? null
        : (toISOStringSafe(snapshot.deleted_at) satisfies string &
            tags.Format<"date-time">),
    payload:
      snapshot.payload === null || snapshot.payload.deleted_at !== null
        ? null
        : {
            id: snapshot.payload.id,
            shopping_mall_snapshot_id:
              snapshot.payload.shopping_mall_snapshot_id,
            payload: snapshot.payload.payload,
            created_at: toISOStringSafe(
              snapshot.payload.created_at,
            ) satisfies string & tags.Format<"date-time">,
            updated_at: toISOStringSafe(
              snapshot.payload.updated_at,
            ) satisfies string & tags.Format<"date-time">,
            deleted_at: null,
          },
    parties: snapshot.snapshotParties
      .filter((p) => p.deleted_at === null)
      .map((p) => ({
        id: p.id,
        shopping_mall_snapshot_id: p.shopping_mall_snapshot_id,
        party_type: p.party_type,
        party_id: p.party_id,
        can_view: p.can_view,
        created_at: toISOStringSafe(p.created_at) satisfies string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(p.updated_at) satisfies string &
          tags.Format<"date-time">,
        deleted_at: null,
      })),
  };
}
