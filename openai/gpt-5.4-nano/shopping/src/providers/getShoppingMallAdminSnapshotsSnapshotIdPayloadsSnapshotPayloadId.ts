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

export async function getShoppingMallAdminSnapshotsSnapshotIdPayloadsSnapshotPayloadId(props: {
  admin: AdminPayload;
  snapshotId: string & tags.Format<"uuid">;
  snapshotPayloadId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSnapshotPayload> {
  const party = await MyGlobal.prisma.shopping_mall_snapshot_parties.findFirst({
    where: {
      shopping_mall_snapshot_id: props.snapshotId,
      deleted_at: null,
      can_view: true,
    },
    select: { id: true },
  });
  if (party === null) {
    throw new HttpException("Forbidden", 403);
  }
  const payload =
    await MyGlobal.prisma.shopping_mall_snapshot_payloads.findFirstOrThrow({
      where: {
        id: props.snapshotPayloadId,
        shopping_mall_snapshot_id: props.snapshotId,
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
    });
  return await ShoppingMallSnapshotPayloadTransformer.transform(payload);
}
