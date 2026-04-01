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

export async function patchShoppingMallMemberSnapshotsSnapshotIdParties(props: {
  member: MemberPayload;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallSnapshotParty.IUpdate;
}): Promise<IShoppingMallSnapshotParty.ISummary> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: { id: true, created_by_member_id: true },
    });
  if (snapshot.created_by_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const trimmedPartyType = props.body.partyType.trim();
  if (trimmedPartyType.length === 0) {
    throw new HttpException("partyType is required", 400);
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.shopping_mall_snapshot_parties.findFirst({
      where: {
        shopping_mall_snapshot_id: props.snapshotId,
        party_type: trimmedPartyType,
        party_id: props.body.partyId,
      },
    });
    if (existing) {
      return tx.shopping_mall_snapshot_parties.update({
        where: { id: existing.id },
        data: {
          can_view: props.body.canView,
          deleted_at: null,
          updated_at: new Date(),
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
    }
    return tx.shopping_mall_snapshot_parties.create({
      data: {
        id: v4(),
        shopping_mall_snapshot_id: props.snapshotId,
        party_type: trimmedPartyType,
        party_id: props.body.partyId,
        can_view: props.body.canView,
        deleted_at: null,
        created_at: new Date(),
        updated_at: new Date(),
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
  });
  return {
    id: updated.id,
    shopping_mall_snapshot_id: updated.shopping_mall_snapshot_id,
    party_type: updated.party_type,
    party_id: updated.party_id,
    can_view: updated.can_view,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  } satisfies IShoppingMallSnapshotParty.ISummary;
}
