import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function patchShoppingMallAdminSnapshotsSnapshotIdPayloads(props: {
  admin: AdminPayload;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallSnapshotPayload.IUpdate;
}): Promise<IShoppingMallSnapshotPayload> {
  const snapshot = await MyGlobal.prisma.shopping_mall_snapshots.findUnique({
    where: { id: props.snapshotId },
    select: {
      id: true,
      deleted_at: true,
      created_at: true,
      updated_at: true,
      reason: true,
      source_type: true,
      source_entity_id: true,
      source_seller_id: true,
      source_order_id: true,
      source_order_item_id: true,
      source_review_id: true,
      source_cancellation_request_id: true,
      source_refund_request_id: true,
    },
  });
  if (snapshot === null) {
    throw new HttpException("Not Found", 404);
  }
  if (snapshot.deleted_at !== null) {
    throw new HttpException("Snapshot is not available", 400);
  }
  if (props.body.payload.trim().length === 0) {
    throw new HttpException("payload is required", 400);
  }
  const canView =
    await MyGlobal.prisma.shopping_mall_snapshot_parties.findFirst({
      where: {
        shopping_mall_snapshot_id: props.snapshotId,
        can_view: true,
        deleted_at: null,
        party_type: "admin",
        party_id: props.admin.id,
      },
      select: { id: true },
    });
  if (canView === null) {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date();
    return tx.shopping_mall_snapshot_payloads.upsert({
      where: { shopping_mall_snapshot_id: props.snapshotId },
      update: {
        payload: props.body.payload,
        updated_at: now,
      },
      create: {
        id: typia.assert<string & tags.Format<"uuid">>(v4()),
        shopping_mall_snapshot_id: props.snapshotId,
        payload: props.body.payload,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  });
  return {
    id: updated.id,
    shopping_mall_snapshot_id: updated.shopping_mall_snapshot_id,
    payload: updated.payload,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
