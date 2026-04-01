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

export async function postShoppingMallAdminSnapshotsSnapshotIdParties(props: {
  admin: AdminPayload;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallSnapshotParty.ICreate;
}): Promise<IShoppingMallSnapshotParty> {
  const admin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: { id: props.admin.id },
    select: { id: true, deleted_at: true },
  });
  if (admin === null || admin.deleted_at !== null) {
    throw new HttpException("You're not enrolled", 403);
  }
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.shopping_mall_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: { id: true },
    });
    try {
      return await prisma.shopping_mall_snapshot_parties.create({
        data: {
          id: v4(),
          shopping_mall_snapshot_id: props.snapshotId,
          party_type: props.body.partyType,
          party_id: props.body.partyId,
          can_view: props.body.canView,
          deleted_at: null,
          created_at: now,
          updated_at: now,
        },
        ...ShoppingMallSnapshotPartyTransformer.select(),
      });
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new HttpException("Snapshot party already exists", 409);
      }
      throw e;
    }
  });
  return await ShoppingMallSnapshotPartyTransformer.transform(created);
}
