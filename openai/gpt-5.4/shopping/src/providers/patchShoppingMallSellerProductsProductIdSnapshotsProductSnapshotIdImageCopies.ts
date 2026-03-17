import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSnapshotImageCopy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotImageCopy";
import { IShoppingMallProductSnapshotImageCopy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImageCopy";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductSnapshotImageCopyAtSummaryTransformer } from "../transformers/ShoppingMallProductSnapshotImageCopyAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdSnapshotsProductSnapshotIdImageCopies(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  productSnapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshotImageCopy.IRequest;
}): Promise<IPageIShoppingMallProductSnapshotImageCopy.ISummary> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
      where: { id: props.productSnapshotId },
      select: {
        id: true,
        shopping_mall_product_id: true,
      },
    });
  if (snapshot.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const direction = props.body.direction ?? "asc";
  const orderByInput = (
    props.body.sort === "created_at"
      ? [{ created_at: direction }, { sequence: "asc" }]
      : [{ sequence: direction }]
  ) satisfies Prisma.shopping_mall_product_snapshot_image_copiesOrderByWithRelationInput[];
  const data =
    await MyGlobal.prisma.shopping_mall_product_snapshot_image_copies.findMany({
      where: {
        shopping_mall_product_snapshot_id: props.productSnapshotId,
      },
      orderBy: orderByInput,
      skip,
      take: limit,
      ...ShoppingMallProductSnapshotImageCopyAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_product_snapshot_image_copies.count({
      where: {
        shopping_mall_product_snapshot_id: props.productSnapshotId,
      },
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallProductSnapshotImageCopyAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
