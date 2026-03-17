import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallProductSnapshotSkusTransformer } from "../transformers/ShoppingMallProductSnapshotSkusTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminSnapshotsSnapshotIdSkusesSkuId(props: {
  admin: AdminPayload;
  snapshotId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSnapshotSkus> {
  // Step 1: Validate parent snapshot exists (404 if not found)
  await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
    where: { id: props.snapshotId },
    select: { id: true },
  });
  // Step 2: Fetch the SKU record scoped to the given snapshot
  // findFirstOrThrow validates both existence and parent-child relationship
  const sku =
    await MyGlobal.prisma.shopping_mall_product_snapshot_skuses.findFirstOrThrow(
      {
        where: {
          id: props.skuId,
          product_snapshot_id: props.snapshotId,
        },
        ...ShoppingMallProductSnapshotSkusTransformer.select(),
      },
    );
  // Step 3: Transform and return the DTO
  return ShoppingMallProductSnapshotSkusTransformer.transform(sku);
}
