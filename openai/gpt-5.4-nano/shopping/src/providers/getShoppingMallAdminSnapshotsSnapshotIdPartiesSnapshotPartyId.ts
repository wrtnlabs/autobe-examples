import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSnapshotPartyTransformer } from "../transformers/ShoppingMallSnapshotPartyTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminSnapshotsSnapshotIdPartiesSnapshotPartyId(props: {
  admin: AdminPayload;
  snapshotId: string & tags.Format<"uuid">;
  snapshotPartyId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSnapshotParty> {
  const authorized =
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
  if (authorized === null) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_snapshots.findUniqueOrThrow({
    where: { id: props.snapshotId, deleted_at: null },
    select: { id: true },
  });
  const select = ShoppingMallSnapshotPartyTransformer.select().select;
  const row =
    await MyGlobal.prisma.shopping_mall_snapshot_parties.findFirstOrThrow({
      where: {
        id: props.snapshotPartyId,
        shopping_mall_snapshot_id: props.snapshotId,
        deleted_at: null,
      },
      select,
    });
  return ShoppingMallSnapshotPartyTransformer.transform(
    row as unknown as ShoppingMallSnapshotPartyTransformer.Payload,
  );
}
