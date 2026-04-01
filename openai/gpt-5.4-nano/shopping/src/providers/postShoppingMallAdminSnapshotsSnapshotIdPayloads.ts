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

export async function postShoppingMallAdminSnapshotsSnapshotIdPayloads(props: {
  admin: AdminPayload;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallSnapshotPayload.ICreate;
}): Promise<IShoppingMallSnapshotPayload> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const snapshot = await tx.shopping_mall_snapshots.findUnique({
      where: { id: props.snapshotId },
      select: { id: true, deleted_at: true },
    });
    if (snapshot === null || snapshot.deleted_at !== null) {
      throw new HttpException("Forbidden", 403);
    }
    const visibility = await tx.shopping_mall_snapshot_parties.findFirst({
      where: {
        shopping_mall_snapshot_id: props.snapshotId,
        party_type: "admin",
        party_id: props.admin.id,
        can_view: true,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (visibility === null) {
      throw new HttpException("Forbidden", 403);
    }
    const existing = await tx.shopping_mall_snapshot_payloads.findUnique({
      where: { shopping_mall_snapshot_id: props.snapshotId },
      select: { id: true },
    });
    if (existing !== null) {
      throw new HttpException("Conflict", 409);
    }
    const created = await tx.shopping_mall_snapshot_payloads.create({
      data: {
        id: v4(),
        payload: props.body.payload,
        created_at: toISOStringSafe(new Date(Date.now())),
        updated_at: toISOStringSafe(new Date(Date.now())),
        deleted_at: null,
        snapshot: { connect: { id: props.snapshotId } },
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
    return {
      id: created.id as string & tags.Format<"uuid">,
      shopping_mall_snapshot_id: created.shopping_mall_snapshot_id as string &
        tags.Format<"uuid">,
      payload: created.payload,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at === null
          ? null
          : toISOStringSafe(created.deleted_at),
    };
  });
}
