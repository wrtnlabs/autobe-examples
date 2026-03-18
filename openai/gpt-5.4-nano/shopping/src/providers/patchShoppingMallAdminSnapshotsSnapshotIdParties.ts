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
import { ShoppingMallSnapshotPartyAtSummaryTransformer } from "../transformers/ShoppingMallSnapshotPartyAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminSnapshotsSnapshotIdParties(props: {
  admin: AdminPayload;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallSnapshotParty.IUpdate;
}): Promise<IShoppingMallSnapshotParty.ISummary> {
  // Ensure target snapshot exists (404 if not found)
  await MyGlobal.prisma.shopping_mall_snapshots.findUniqueOrThrow({
    where: { id: props.snapshotId },
    select: { id: true },
  });
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_snapshot_parties.upsert({
      where: {
        shopping_mall_snapshot_id_party_type_party_id: {
          shopping_mall_snapshot_id: props.snapshotId,
          party_type: props.body.partyType,
          party_id: props.body.partyId,
        },
      },
      create: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_snapshot_id: props.snapshotId,
        party_type: props.body.partyType,
        party_id: props.body.partyId,
        can_view: props.body.canView,
        deleted_at: null,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
      update: {
        can_view: props.body.canView,
        deleted_at: null,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  });
  const party =
    await MyGlobal.prisma.shopping_mall_snapshot_parties.findUniqueOrThrow({
      where: {
        shopping_mall_snapshot_id_party_type_party_id: {
          shopping_mall_snapshot_id: props.snapshotId,
          party_type: props.body.partyType,
          party_id: props.body.partyId,
        },
      },
      ...ShoppingMallSnapshotPartyAtSummaryTransformer.select(),
    });
  return await ShoppingMallSnapshotPartyAtSummaryTransformer.transform(party);
}
