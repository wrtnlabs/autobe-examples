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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallSnapshotTransformer } from "../transformers/ShoppingMallSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberMemberSnapshotsSnapshotId(props: {
  member: MemberPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSnapshot> {
  const partyType = "member";
  const partyId = props.member.id;
  const partyVisibility =
    await MyGlobal.prisma.shopping_mall_snapshot_parties.findFirst({
      where: {
        shopping_mall_snapshot_id: props.snapshotId,
        party_type: partyType,
        party_id: partyId,
        can_view: true,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (partyVisibility === null) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshot = await MyGlobal.prisma.shopping_mall_snapshots.findUnique({
    where: { id: props.snapshotId },
    select: ShoppingMallSnapshotTransformer.select() as any,
  });
  if (snapshot === null || snapshot.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  return ShoppingMallSnapshotTransformer.transform(snapshot as any);
}
