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
import { ShoppingMallSnapshotTransformer } from "../transformers/ShoppingMallSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSnapshot> {
  const partyVisibility =
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
  if (partyVisibility === null) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshot = await MyGlobal.prisma.shopping_mall_snapshots.findUnique({
    where: { id: props.snapshotId },
    ...ShoppingMallSnapshotTransformer.select(),
  });
  if (snapshot === null || snapshot.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallSnapshotTransformer.transform(snapshot);
}
