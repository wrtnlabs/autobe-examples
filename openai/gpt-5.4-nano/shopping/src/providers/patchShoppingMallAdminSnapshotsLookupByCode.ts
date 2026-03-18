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
  const snapshotCode = (
    props.body as unknown as {
      snapshotCode?: string;
    }
  ).snapshotCode;
  if (snapshotCode === undefined) {
    throw new HttpException("snapshotCode is required", 400);
  }
  if (snapshotCode.trim().length === 0) {
    throw new HttpException("snapshotCode must be non-empty", 400);
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
        party_type: "admin",
        party_id: props.admin.id,
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
  const payload =
    await MyGlobal.prisma.shopping_mall_snapshot_payloads.findFirst({
      where: {
        shopping_mall_snapshot_id: snapshot.id,
        deleted_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        shopping_mall_snapshot_id: true,
        payload: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const partiesDto: IShoppingMallSnapshotParty.ISummary[] = parties.map(
    (p) => ({
      id: p.id as string & tags.Format<"uuid">,
      shopping_mall_snapshot_id: p.shopping_mall_snapshot_id as string &
        tags.Format<"uuid">,
      party_type: p.party_type,
      party_id: p.party_id as string & tags.Format<"uuid">,
      can_view: p.can_view,
      created_at: p.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updated_at: p.updated_at.toISOString() as string &
        tags.Format<"date-time">,
      deleted_at: p.deleted_at?.toISOString() as
        | (string & tags.Format<"date-time">)
        | null,
    }),
  );
  return {
    id: snapshot.id as string & tags.Format<"uuid">,
    snapshotCode: snapshot.snapshot_code,
    sourceType: snapshot.source_type,
    sourceEntityId: snapshot.source_entity_id as string & tags.Format<"uuid">,
    sourceSellerId: snapshot.source_seller_id
      ? (snapshot.source_seller_id as string & tags.Format<"uuid">)
      : null,
    sourceOrderId: snapshot.source_order_id
      ? (snapshot.source_order_id as string & tags.Format<"uuid">)
      : null,
    sourceOrderItemId: snapshot.source_order_item_id
      ? (snapshot.source_order_item_id as string & tags.Format<"uuid">)
      : null,
    sourceReviewId: snapshot.source_review_id
      ? (snapshot.source_review_id as string & tags.Format<"uuid">)
      : null,
    sourceCancellationRequestId: snapshot.source_cancellation_request_id
      ? (snapshot.source_cancellation_request_id as string &
          tags.Format<"uuid">)
      : null,
    sourceRefundRequestId: snapshot.source_refund_request_id
      ? (snapshot.source_refund_request_id as string & tags.Format<"uuid">)
      : null,
    createdByMemberId: snapshot.created_by_member_id
      ? (snapshot.created_by_member_id as string & tags.Format<"uuid">)
      : null,
    reason: snapshot.reason,
    createdAt: snapshot.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updatedAt: snapshot.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deletedAt: snapshot.deleted_at
      ? (snapshot.deleted_at.toISOString() as string & tags.Format<"date-time">)
      : null,
    payload: payload
      ? ({
          id: payload.id as string & tags.Format<"uuid">,
          shopping_mall_snapshot_id:
            payload.shopping_mall_snapshot_id as string & tags.Format<"uuid">,
          payload: payload.payload,
          created_at: payload.created_at.toISOString() as string &
            tags.Format<"date-time">,
          updated_at: payload.updated_at.toISOString() as string &
            tags.Format<"date-time">,
          deleted_at: payload.deleted_at
            ? (payload.deleted_at.toISOString() as string &
                tags.Format<"date-time">)
            : null,
        } satisfies IShoppingMallSnapshotPayload)
      : null,
    parties: partiesDto,
  };
}
