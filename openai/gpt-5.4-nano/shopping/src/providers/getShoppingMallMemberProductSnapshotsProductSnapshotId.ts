import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallProductSnapshotTransformer } from "../transformers/ShoppingMallProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberProductSnapshotsProductSnapshotId(props: {
  member: MemberPayload;
  productSnapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUnique({
      where: { id: props.productSnapshotId },
      ...ShoppingMallProductSnapshotTransformer.select(),
    });
  if (snapshot === null) {
    throw new HttpException("Not Found", 404);
  }
  const visibility =
    await MyGlobal.prisma.shopping_mall_snapshot_parties.findFirst({
      where: {
        shopping_mall_snapshot_id: props.productSnapshotId,
        party_type: props.member.type,
        party_id: props.member.id,
        can_view: true,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (visibility === null) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallProductSnapshotTransformer.transform(snapshot);
}
