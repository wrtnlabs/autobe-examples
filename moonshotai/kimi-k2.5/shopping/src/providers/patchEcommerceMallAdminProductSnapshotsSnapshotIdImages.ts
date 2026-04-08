import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshotImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductSnapshotImageAtSummaryTransformer } from "../transformers/EcommerceMallProductSnapshotImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminProductSnapshotsSnapshotIdImages(props: {
  admin: AdminPayload;
  snapshotId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductSnapshotImage.IRequest;
}): Promise<IPageIEcommerceMallProductSnapshotImage.ISummary> {
  // Verify snapshot exists - admins have oversight over all products (section 30)
  await MyGlobal.prisma.ecommerce_mall_product_snapshots.findUniqueOrThrow({
    where: { id: props.snapshotId },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build display_order filter
  const displayOrderFilter: Prisma.IntFilter | undefined =
    props.body.displayOrderMin !== undefined ||
    props.body.displayOrderMax !== undefined
      ? {
          ...(props.body.displayOrderMin !== undefined && {
            gte: props.body.displayOrderMin,
          }),
          ...(props.body.displayOrderMax !== undefined && {
            lte: props.body.displayOrderMax,
          }),
        }
      : undefined;
  // Build where clause with optional filters
  const whereInput = {
    ecommerce_mall_product_snapshot_id: props.snapshotId,
    ...(displayOrderFilter !== undefined && {
      display_order: displayOrderFilter,
    }),
  } satisfies Prisma.ecommerce_mall_product_snapshot_imagesWhereInput;
  // Query images with pagination and sorting
  const images =
    await MyGlobal.prisma.ecommerce_mall_product_snapshot_images.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { display_order: "asc" },
      ...EcommerceMallProductSnapshotImageAtSummaryTransformer.select(),
    });
  // Count total records for pagination
  const total =
    await MyGlobal.prisma.ecommerce_mall_product_snapshot_images.count({
      where: whereInput,
    });
  // Transform and return paginated result
  return {
    data: await ArrayUtil.asyncMap(
      images,
      EcommerceMallProductSnapshotImageAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
