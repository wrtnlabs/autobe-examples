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

export async function getShoppingMallMemberSnapshotsSnapshotId(props: {
  member: MemberPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSnapshot> {
  const snapshot = await MyGlobal.prisma.shopping_mall_snapshots.findUnique({
    where: { id: props.snapshotId },
    ...ShoppingMallSnapshotTransformer.select(),
  });
  if (snapshot === null) {
    // Avoid leaking existence: return the same denial for not-found vs unauthorized.
    throw new HttpException("Forbidden", 403);
  }
  const canView = snapshot.snapshotParties.some(
    (party) =>
      party.can_view === true &&
      party.deleted_at === null &&
      party.party_id === props.member.id,
  );
  if (!canView) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallSnapshotTransformer.transform(snapshot);
}
