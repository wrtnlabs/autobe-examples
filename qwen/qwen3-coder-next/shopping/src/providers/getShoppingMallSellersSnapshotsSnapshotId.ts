import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellersSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellersSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellersSnapshotsSnapshotId(props: {
  snapshotId: string;
}): Promise<IShoppingMallSellersSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_sellers_snapshots.findUnique({
      where: { id: props.snapshotId as string & tags.Format<"uuid"> },
      include: {
        seller: true,
      },
    });
  if (!snapshot) throw new HttpException("Snapshot not found", 404);
  return {
    id: snapshot.id,
    shopping_mall_seller_id: snapshot.shopping_mall_seller_id,
    shop_name: snapshot.shop_name,
    shop_description:
      snapshot.shop_description === null
        ? undefined
        : snapshot.shop_description,
    logo_image_id: snapshot.logo_image_id,
    created_at: toISOStringSafe(snapshot.created_at),
  };
}
