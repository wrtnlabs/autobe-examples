import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotImage";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
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

export async function patchShoppingMallAdminSnapshotsSnapshotIdImages(props: {
  admin: AdminPayload;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshotImage.IRequest;
}): Promise<IPageIShoppingMallProductSnapshotImage.ISummary> {
  // Step 1: Validate snapshot exists (auto 404 if not found)
  await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
    where: { id: props.snapshotId },
    select: { id: true },
  });
  // Step 2: Parse pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "sequence";
  const order = props.body.order ?? "asc";
  // Step 3: Build orderBy clause (no 'as' assertions)
  const orderByInput = (
    sort === "created_at"
      ? { created_at: order === "desc" ? ("desc" as const) : ("asc" as const) }
      : { sequence: order === "desc" ? ("desc" as const) : ("asc" as const) }
  ) satisfies Prisma.shopping_mall_product_snapshot_imagesOrderByWithRelationInput;
  // Step 4: Build WHERE clause
  const whereInput = {
    product_snapshot_id: props.snapshotId,
  } satisfies Prisma.shopping_mall_product_snapshot_imagesWhereInput;
  // Step 5: Query paginated records
  const records =
    await MyGlobal.prisma.shopping_mall_product_snapshot_images.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      select: {
        id: true,
        product_snapshot_id: true,
        url: true,
        sequence: true,
        created_at: true,
      },
    });
  // Step 6: Count total matching records (sequential, not Promise.all)
  const total =
    await MyGlobal.prisma.shopping_mall_product_snapshot_images.count({
      where: whereInput,
    });
  // Step 7: Map to ISummary DTOs without 'as' assertions
  const data: IShoppingMallProductSnapshotImage.ISummary[] = records.map(
    (record) =>
      ({
        id: record.id,
        product_snapshot_id: record.product_snapshot_id,
        url: record.url,
        sequence: record.sequence,
        created_at: record.created_at.toISOString(),
      }) satisfies IShoppingMallProductSnapshotImage.ISummary,
  );
  // Step 8: Return paginated result
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
