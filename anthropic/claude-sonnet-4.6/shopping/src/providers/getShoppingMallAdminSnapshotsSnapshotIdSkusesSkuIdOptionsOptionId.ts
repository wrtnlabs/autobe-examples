import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallProductSnapshotSkusOptionTransformer } from "../transformers/ShoppingMallProductSnapshotSkusOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminSnapshotsSnapshotIdSkusesSkuIdOptionsOptionId(props: {
  admin: AdminPayload;
  snapshotId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSnapshotSkusOption> {
  // Step 1: Validate snapshotId — 404 if not found
  await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
    where: { id: props.snapshotId },
    select: { id: true },
  });
  // Step 2: Validate skuId with parent snapshotId — 404 if not found or mismatch
  await MyGlobal.prisma.shopping_mall_product_snapshot_skuses.findFirstOrThrow({
    where: {
      id: props.skuId,
      product_snapshot_id: props.snapshotId,
    },
    select: { id: true },
  });
  // Step 3: Find the option record with hierarchical validation
  const option =
    await MyGlobal.prisma.shopping_mall_product_snapshot_skus_options.findFirstOrThrow(
      {
        where: {
          id: props.optionId,
          product_snapshot_skus_id: props.skuId,
        },
        ...ShoppingMallProductSnapshotSkusOptionTransformer.select(),
      },
    );
  return ShoppingMallProductSnapshotSkusOptionTransformer.transform(option);
}
