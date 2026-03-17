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
import { ShoppingMallProductSnapshotImageAtSummaryTransformer } from "../transformers/ShoppingMallProductSnapshotImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdSnapshotsSnapshotIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshotImage.IRequest;
}): Promise<IPageIShoppingMallProductSnapshotImage.ISummary> {
  // Step 1: Validate product existence (including soft-deleted products, as snapshots are retained)
  const product = await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow(
    {
      where: { id: props.productId },
      select: { id: true, shopping_mall_seller_id: true },
    },
  );
  // Step 2: Authorization — seller may only access their own product's snapshots
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Validate snapshot exists and belongs to the given product
  await MyGlobal.prisma.shopping_mall_product_snapshots.findFirstOrThrow({
    where: { id: props.snapshotId, product_id: props.productId },
    select: { id: true },
  });
  // Step 4: Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 5: Ordering
  const sortField = props.body.sort ?? "sequence";
  const sortDirection = props.body.order ?? "asc";
  const orderByInput = (
    sortField === "created_at"
      ? { created_at: sortDirection as "asc" | "desc" }
      : { sequence: sortDirection as "asc" | "desc" }
  ) satisfies Prisma.shopping_mall_product_snapshot_imagesOrderByWithRelationInput;
  // Step 6: Where clause
  const whereInput = {
    product_snapshot_id: props.snapshotId,
  } satisfies Prisma.shopping_mall_product_snapshot_imagesWhereInput;
  // Step 7: Query images
  const data =
    await MyGlobal.prisma.shopping_mall_product_snapshot_images.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallProductSnapshotImageAtSummaryTransformer.select(),
    });
  // Step 8: Count total
  const total =
    await MyGlobal.prisma.shopping_mall_product_snapshot_images.count({
      where: whereInput,
    });
  // Step 9: Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallProductSnapshotImageAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
