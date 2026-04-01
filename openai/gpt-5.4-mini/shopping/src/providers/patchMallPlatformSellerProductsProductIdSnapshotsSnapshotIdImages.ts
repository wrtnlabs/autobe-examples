import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerProductsProductIdSnapshotsSnapshotIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IMallPlatformProductSnapshotImage.IRequest;
}): Promise<IPageIMallPlatformProductSnapshotImage.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const sort: "asc" | "desc" = props.body.sort ?? "asc";
  await MyGlobal.prisma.mall_platform_products.findFirstOrThrow({
    where: {
      id: props.productId,
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.mall_platform_product_snapshots.findFirstOrThrow({
    where: {
      id: props.snapshotId,
      product: {
        id: props.productId,
      },
    },
    select: {
      id: true,
    },
  });
  const where: Prisma.mall_platform_product_snapshot_imagesWhereInput = {
    mall_platform_product_snapshot_id: props.snapshotId,
  };
  const data =
    await MyGlobal.prisma.mall_platform_product_snapshot_images.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        sort_order: sort,
      },
      select: {
        id: true,
        mall_platform_product_snapshot_id: true,
        image_uri: true,
        sort_order: true,
        created_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.mall_platform_product_snapshot_images.count({
      where,
    });
  return {
    data: data.map((item) => ({
      id: item.id,
      productSnapshot: {
        id: props.snapshotId,
        snapshotKind: "",
        productName: "",
        productDescription: "",
        categoryName: null,
        basePrice: 0,
        mainImageUri: null,
        imageCount: 0,
        variantCount: 0,
        createdAt: toISOStringSafe(item.created_at),
      },
      imageUri: item.image_uri,
      sortOrder: item.sort_order,
      createdAt: toISOStringSafe(item.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
