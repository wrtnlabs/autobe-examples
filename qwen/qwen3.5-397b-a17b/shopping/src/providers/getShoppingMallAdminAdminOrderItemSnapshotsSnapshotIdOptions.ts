import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallOrderItemSnapshotOptionTransformer } from "../transformers/ShoppingMallOrderItemSnapshotOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminAdminOrderItemSnapshotsSnapshotIdOptions(props: {
  admin: AdminPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItemSnapshotOption[]> {
  await MyGlobal.prisma.shopping_mall_order_item_snapshots.findUniqueOrThrow({
    where: { id: props.snapshotId },
  });
  const options =
    await MyGlobal.prisma.shopping_mall_order_item_snapshot_options.findMany({
      where: { shopping_mall_order_item_snapshot_id: props.snapshotId },
      ...ShoppingMallOrderItemSnapshotOptionTransformer.select(),
      orderBy: { key: "asc" },
    });
  return await ArrayUtil.asyncMap(
    options,
    ShoppingMallOrderItemSnapshotOptionTransformer.transform,
  );
}
