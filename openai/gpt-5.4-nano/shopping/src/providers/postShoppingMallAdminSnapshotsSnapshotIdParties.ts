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
  await MyGlobal.prisma.shopping_mall_snapshots.findUniqueOrThrow({
    where: { id: props.snapshotId },
    select: { id: true },
  });
  try {
    const now = toISOStringSafe(new Date());
    const created = await MyGlobal.prisma.shopping_mall_snapshot_parties.create(
      {
        data: {
          id: v4() as string & tags.Format<"uuid">,
          party_type: props.body.partyType,
          party_id: props.body.partyId,
          can_view: props.body.canView,
          shopping_mall_snapshot_id: props.snapshotId,
          deleted_at: null,
          created_at: new Date(now),
          updated_at: new Date(now),
        },
        ...ShoppingMallSnapshotPartyTransformer.select(),
      },
    );
    return await ShoppingMallSnapshotPartyTransformer.transform(created);
  } catch (err: unknown) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException("Snapshot party entry already exists", 409);
    }
    throw err;
  }
}
