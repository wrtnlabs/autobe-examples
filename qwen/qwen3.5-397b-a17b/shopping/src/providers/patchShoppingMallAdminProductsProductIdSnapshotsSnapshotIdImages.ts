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

export async function patchShoppingMallAdminProductsProductIdSnapshotsSnapshotIdImages(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshotImage.IRequest;
}): Promise<IPageIShoppingMallProductSnapshotImage.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortParam = props.body.sort ?? "display_order,asc";
  const [sortField, sortDirection] = sortParam.split(",") as [
    string,
    "asc" | "desc",
  ];
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        shopping_mall_product_id: props.productId,
      },
    });
  const orderByInput =
    sortField === "created_at"
      ? { created_at: sortDirection }
      : { display_order: sortDirection };
  const whereInput = {
    shopping_mall_product_snapshot_id: props.snapshotId,
  } satisfies Prisma.shopping_mall_product_snapshot_imagesWhereInput;
  const data =
    await MyGlobal.prisma.shopping_mall_product_snapshot_images.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
    });
  const total =
    await MyGlobal.prisma.shopping_mall_product_snapshot_images.count({
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
      (image) =>
        ({
          id: image.id as string & tags.Format<"uuid">,
          image_url: image.image_url,
          display_order: image.display_order,
          created_at: toISOStringSafe(image.created_at),
        }) satisfies IShoppingMallProductSnapshotImage.ISummary,
    ),
  } satisfies IPageIShoppingMallProductSnapshotImage.ISummary;
}
