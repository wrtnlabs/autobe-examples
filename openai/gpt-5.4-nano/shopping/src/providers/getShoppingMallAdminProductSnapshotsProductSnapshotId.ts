import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallProductSnapshotTransformer } from "../transformers/ShoppingMallProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminProductSnapshotsProductSnapshotId(props: {
  admin: AdminPayload;
  productSnapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSnapshot> {
  const canView =
    await MyGlobal.prisma.shopping_mall_snapshot_parties.findFirst({
      where: {
        shopping_mall_snapshot_id: props.productSnapshotId,
        party_type: "admin",
        party_id: props.admin.id,
        can_view: true,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (canView === null) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUnique({
      where: { id: props.productSnapshotId },
      ...ShoppingMallProductSnapshotTransformer.select(),
    });
  if (snapshot === null) {
    // Keep response behavior consistent and avoid leaking existence.
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallProductSnapshotTransformer.transform(snapshot);
}
