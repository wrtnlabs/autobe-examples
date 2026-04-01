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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberSnapshotsLookupByCode(props: {
  member: MemberPayload;
  body: IShoppingMallSnapshot.IRequest;
}): Promise<IShoppingMallSnapshot> {
  const snapshotCode = (
    props.body as unknown as {
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
  const parties = await MyGlobal.prisma.shopping_mall_snapshot_parties.findMany(
    {
      where: {
        shopping_mall_snapshot_id: snapshot.id,
        deleted_at: null,
        can_view: true,
        party_type: "member",
        party_id: props.member.id,
      },
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
  if (parties.length === 0) {
    throw new HttpException("Forbidden", 403);
  }
  const payloadRows =
    await MyGlobal.prisma.shopping_mall_snapshot_payloads.findMany({
      where: {
        shopping_mall_snapshot_id: snapshot.id,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_snapshot_id: true,
        payload: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
      orderBy: { created_at: "desc" },
      take: 1,
    });
  const payloadRow = payloadRows[0] ?? null;
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
    createdAt: toISOStringSafe(snapshot.created_at),
    updatedAt: toISOStringSafe(snapshot.updated_at),
    deletedAt: null,
    payload: payloadRow
      ? {
          id: payloadRow.id,
          shopping_mall_snapshot_id: payloadRow.shopping_mall_snapshot_id,
          payload: payloadRow.payload,
          created_at: toISOStringSafe(payloadRow.created_at),
          updated_at: toISOStringSafe(payloadRow.updated_at),
          deleted_at: null,
        }
      : null,
    parties: parties.map((p) => ({
      id: p.id,
      shopping_mall_snapshot_id: p.shopping_mall_snapshot_id,
      party_type: p.party_type,
      party_id: p.party_id,
      can_view: p.can_view,
      created_at: toISOStringSafe(p.created_at),
      updated_at: toISOStringSafe(p.updated_at),
      deleted_at: null,
    })),
  };
}
