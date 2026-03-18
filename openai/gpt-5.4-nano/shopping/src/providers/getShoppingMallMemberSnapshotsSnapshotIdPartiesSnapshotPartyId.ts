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
import { ShoppingMallSnapshotPartyTransformer } from "../transformers/ShoppingMallSnapshotPartyTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberSnapshotsSnapshotIdPartiesSnapshotPartyId(props: {
  member: MemberPayload;
  snapshotId: string & tags.Format<"uuid">;
  snapshotPartyId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSnapshotParty> {
  const snapshotParty =
    await MyGlobal.prisma.shopping_mall_snapshot_parties.findUniqueOrThrow({
      where: {
        id: props.snapshotPartyId,
        shopping_mall_snapshot_id: props.snapshotId,
      },
      ...ShoppingMallSnapshotPartyTransformer.select(),
    });
  if (snapshotParty.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // Authorization check will be implemented via snapshot visibility relationship
  const allowed =
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
  if (!allowed) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallSnapshotPartyTransformer.transform(snapshotParty);
}
