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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductSnapshotImageAtSummaryTransformer } from "../transformers/EcommerceMallProductSnapshotImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductSnapshotsSnapshotIdImages(props: {
  seller: SellerPayload;
  snapshotId: string;
  body: IEcommerceMallProductSnapshotImage.IRequest;
}): Promise<IPageIEcommerceMallProductSnapshotImage.ISummary> {
  // Verify snapshot exists and seller owns the product
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findFirst({
      where: {
        id: props.snapshotId,
      },
      select: {
        id: true,
        product: {
          select: {
            seller_id: true,
          },
        },
      },
    });
  if (snapshot === null) {
    throw new HttpException("Snapshot not found", 404);
  }
  if (snapshot.product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where condition with optional display_order range
  const where = {
    ecommerce_mall_product_snapshot_id: props.snapshotId,
    ...(props.body.displayOrderMin !== undefined ||
    props.body.displayOrderMax !== undefined
      ? {
          display_order: {
            ...(props.body.displayOrderMin !== undefined && {
              gte: props.body.displayOrderMin,
            }),
            ...(props.body.displayOrderMax !== undefined && {
              lte: props.body.displayOrderMax,
            }),
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_mall_product_snapshot_imagesWhereInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Query images
  const images =
    await MyGlobal.prisma.ecommerce_mall_product_snapshot_images.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        display_order: "asc",
      },
      ...EcommerceMallProductSnapshotImageAtSummaryTransformer.select(),
    });
  // Count total
  const total =
    await MyGlobal.prisma.ecommerce_mall_product_snapshot_images.count({
      where,
    });
  // Transform and return
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
