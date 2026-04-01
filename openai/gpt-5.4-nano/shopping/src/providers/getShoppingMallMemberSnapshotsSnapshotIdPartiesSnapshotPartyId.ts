import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
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

export async function getShoppingMallMemberSnapshotsSnapshotIdPartiesSnapshotPartyId(props: {
  member: MemberPayload;
  snapshotId: string & tags.Format<"uuid">;
  snapshotPartyId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSnapshotParty> {
  await MyGlobal.prisma.shopping_mall_snapshots.findUniqueOrThrow({
    where: {
      id: props.snapshotId,
      deleted_at: null,
    },
    select: { id: true },
  });
  const snapshotParty =
    await MyGlobal.prisma.shopping_mall_snapshot_parties.findFirstOrThrow({
      where: {
        id: props.snapshotPartyId,
        shopping_mall_snapshot_id: props.snapshotId,
        deleted_at: null,
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
    });
  const requesterCanView =
    await MyGlobal.prisma.shopping_mall_snapshot_parties.findFirst({
      where: {
        shopping_mall_snapshot_id: props.snapshotId,
        party_type: "member",
        party_id: props.member.id,
        can_view: true,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (requesterCanView === null) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: snapshotParty.id,
    shopping_mall_snapshot_id: snapshotParty.shopping_mall_snapshot_id,
    party_type: snapshotParty.party_type,
    party_id: snapshotParty.party_id,
    can_view: snapshotParty.can_view,
    created_at: snapshotParty.created_at.toISOString(),
    updated_at: snapshotParty.updated_at.toISOString(),
    deleted_at:
      snapshotParty.deleted_at === null
        ? null
        : snapshotParty.deleted_at.toISOString(),
  } satisfies IShoppingMallSnapshotParty;
}
