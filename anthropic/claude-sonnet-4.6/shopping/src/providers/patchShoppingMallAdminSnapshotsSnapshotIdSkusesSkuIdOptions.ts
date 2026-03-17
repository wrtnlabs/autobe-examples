import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotSkusOption";
import { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminSnapshotsSnapshotIdSkusesSkuIdOptions(props: {
  admin: AdminPayload;
  snapshotId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshotSkusOption.IRequest;
}): Promise<IPageIShoppingMallProductSnapshotSkusOption.ISummary> {
  // Step 1: Validate snapshotId exists
  await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
    where: { id: props.snapshotId },
    select: { id: true },
  });
  // Step 2: Validate skuId belongs to the given snapshot
  await MyGlobal.prisma.shopping_mall_product_snapshot_skuses.findFirstOrThrow({
    where: {
      id: props.skuId,
      product_snapshot_id: props.snapshotId,
    },
    select: { id: true },
  });
  // Step 3: Build where clause
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    product_snapshot_skus_id: props.skuId,
    ...(props.body.key !== undefined && {
      key: { contains: props.body.key, mode: "insensitive" as const },
    }),
    ...(props.body.value !== undefined && {
      value: { contains: props.body.value, mode: "insensitive" as const },
    }),
  } satisfies Prisma.shopping_mall_product_snapshot_skus_optionsWhereInput;
  // Step 4+5: Query with pagination and sorting
  const data =
    await MyGlobal.prisma.shopping_mall_product_snapshot_skus_options.findMany({
      where: whereInput,
      orderBy: { sequence: "asc" },
      skip,
      take: limit,
      select: {
        id: true,
        product_snapshot_skus_id: true,
        sequence: true,
        key: true,
        value: true,
      },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_product_snapshot_skus_options.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map(
      (option) =>
        ({
          id: option.id,
          product_snapshot_skus_id: option.product_snapshot_skus_id,
          sequence: option.sequence,
          key: option.key,
          value: option.value,
        }) satisfies IShoppingMallProductSnapshotSkusOption.ISummary,
    ),
  };
}
