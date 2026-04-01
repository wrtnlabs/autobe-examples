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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorProductsProductIdSnapshotsSnapshotIdImages(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IMallPlatformProductSnapshotImage.IRequest;
}): Promise<IPageIMallPlatformProductSnapshotImage.ISummary> {
  const snapshot =
    await MyGlobal.prisma.mall_platform_product_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        mall_platform_product_id: props.productId,
      },
      select: {
        id: true,
        snapshot_kind: true,
        product_name: true,
        product_description: true,
        category_name: true,
        created_at: true,
        base_price: true,
        main_image_uri: true,
        image_count: true,
        variant_count: true,
      },
    });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.mall_platform_product_snapshot_images.findMany({
      where: {
        mall_platform_product_snapshot_id: props.snapshotId,
      },
      skip,
      take: limit,
      orderBy:
        props.body.sort === "desc"
          ? { sort_order: "desc" }
          : { sort_order: "asc" },
      select: {
        id: true,
        image_uri: true,
        sort_order: true,
        created_at: true,
      },
    });
  const records =
    await MyGlobal.prisma.mall_platform_product_snapshot_images.count({
      where: {
        mall_platform_product_snapshot_id: props.snapshotId,
      },
    });
  return {
    data: data.map((row) => ({
      id: row.id,
      productSnapshot: {
        id: snapshot.id,
        snapshotKind: snapshot.snapshot_kind,
        productName: snapshot.product_name,
        productDescription: snapshot.product_description,
        categoryName: snapshot.category_name,
        basePrice: snapshot.base_price,
        mainImageUri: snapshot.main_image_uri,
        imageCount: snapshot.image_count,
        variantCount: snapshot.variant_count,
        createdAt: toISOStringSafe(snapshot.created_at),
      },
      imageUri: row.image_uri,
      sortOrder: row.sort_order,
      createdAt: toISOStringSafe(row.created_at),
    })),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  };
}
