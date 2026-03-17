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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdSnapshotsSnapshotIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshotImage.IRequest;
}): Promise<IPageIShoppingMallProductSnapshotImage.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        shopping_mall_seller_id: true,
      },
    });
  if (snapshot.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Snapshot does not belong to the specified product",
      400,
    );
  }
  if (snapshot.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const sortParam = props.body.sort ?? "display_order,asc";
  const [sortField, sortDirection] = sortParam.split(",") as [
    string,
    "asc" | "desc",
  ];
  const orderByInput = (
    sortField === "created_at"
      ? { created_at: sortDirection === "desc" ? "desc" : "asc" }
      : { display_order: sortDirection === "desc" ? "desc" : "asc" }
  ) satisfies Prisma.shopping_mall_product_snapshot_imagesOrderByWithRelationInput;
  const whereInput = {
    shopping_mall_product_snapshot_id: props.snapshotId,
  } satisfies Prisma.shopping_mall_product_snapshot_imagesWhereInput;
  const data =
    await MyGlobal.prisma.shopping_mall_product_snapshot_images.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        image_url: true,
        display_order: true,
        created_at: true,
      },
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
