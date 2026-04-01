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
import { ShoppingMallSnapshotPayloadTransformer } from "../transformers/ShoppingMallSnapshotPayloadTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminSnapshotsSnapshotIdPayloads(props: {
  admin: AdminPayload;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallSnapshotPayload.IUpdate;
}): Promise<IShoppingMallSnapshotPayload> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: { id: true, deleted_at: true },
    });
  if (snapshot.deleted_at !== null) {
    throw new HttpException("Snapshot is deleted", 400);
  }
  const visibility =
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
  if (visibility === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.payload.trim().length === 0) {
    throw new HttpException("Payload must not be empty", 400);
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_snapshot_payloads.upsert({
      where: { shopping_mall_snapshot_id: props.snapshotId },
      update: { payload: props.body.payload },
      create: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_snapshot_id: props.snapshotId,
        payload: props.body.payload,
        deleted_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    return await tx.shopping_mall_snapshot_payloads.findUniqueOrThrow({
      where: { shopping_mall_snapshot_id: props.snapshotId },
      ...ShoppingMallSnapshotPayloadTransformer.select(),
    });
  });
  return await ShoppingMallSnapshotPayloadTransformer.transform(updated);
}
