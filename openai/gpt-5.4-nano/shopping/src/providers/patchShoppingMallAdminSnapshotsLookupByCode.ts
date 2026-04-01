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

export async function patchShoppingMallAdminSnapshotsLookupByCode(props: {
  admin: AdminPayload;
  body: IShoppingMallSnapshot.IRequest;
}): Promise<IShoppingMallSnapshot> {
  const snapshotCode =
    (
      props.body as {
        snapshotCode?: string;
        snapshot_code?: string;
      }
    ).snapshotCode ??
    (
      props.body as {
        snapshotCode?: string;
        snapshot_code?: string;
      }
    ).snapshot_code;
  if (snapshotCode === undefined || snapshotCode.trim().length === 0) {
    throw new HttpException("snapshotCode is required", 400);
  }
  const snapshot =
    await MyGlobal.prisma.shopping_mall_snapshots.findFirstOrThrow({
      where: {
        snapshot_code: snapshotCode,
        deleted_at: null,
      },
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
      },
    });
  const callerAdminId = props.admin.id;
  const hasPermission =
    await MyGlobal.prisma.shopping_mall_snapshot_parties.findFirst({
      where: {
        shopping_mall_snapshot_id: snapshot.id,
        deleted_at: null,
        can_view: true,
        party_type: "admin",
        party_id: callerAdminId,
      },
      select: { id: true },
    });
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  const payloadRow =
    await MyGlobal.prisma.shopping_mall_snapshot_payloads.findFirst({
      where: {
        shopping_mall_snapshot_id: snapshot.id,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        shopping_mall_snapshot_id: true,
        payload: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const parties = await MyGlobal.prisma.shopping_mall_snapshot_parties.findMany(
    {
      where: {
        shopping_mall_snapshot_id: snapshot.id,
        deleted_at: null,
        can_view: true,
        party_type: "admin",
        party_id: callerAdminId,
      },
      orderBy: { created_at: "desc" },
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
  );
  const payload: IShoppingMallSnapshotPayload | null =
    payloadRow === null
      ? null
      : (() => {
          const created_at = toISOStringSafe(
            payloadRow.created_at,
          ) satisfies string & tags.Format<"date-time">;
          const updated_at = toISOStringSafe(
            payloadRow.updated_at,
          ) satisfies string & tags.Format<"date-time">;
          return {
            id: payloadRow.id,
            shopping_mall_snapshot_id: payloadRow.shopping_mall_snapshot_id,
            payload: payloadRow.payload,
            created_at,
            updated_at,
            deleted_at: payloadRow.deleted_at
              ? toISOStringSafe(payloadRow.deleted_at)
              : null,
          };
        })();
  const createdAt = toISOStringSafe(snapshot.created_at) satisfies string &
    tags.Format<"date-time">;
  const updatedAt = toISOStringSafe(snapshot.updated_at) satisfies string &
    tags.Format<"date-time">;
  const deletedAt = snapshot.deleted_at
    ? toISOStringSafe(snapshot.deleted_at)
    : null;
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
    createdAt,
    updatedAt,
    deletedAt,
    payload,
    parties: parties.map((p): IShoppingMallSnapshotParty.ISummary => {
      const created_at = toISOStringSafe(p.created_at) satisfies string &
        tags.Format<"date-time">;
      const updated_at = toISOStringSafe(p.updated_at) satisfies string &
        tags.Format<"date-time">;
      return {
        id: p.id,
        shopping_mall_snapshot_id: p.shopping_mall_snapshot_id,
        party_type: p.party_type,
        party_id: p.party_id,
        can_view: p.can_view,
        created_at,
        updated_at,
        deleted_at: p.deleted_at ? toISOStringSafe(p.deleted_at) : null,
      };
    }),
  };
}
