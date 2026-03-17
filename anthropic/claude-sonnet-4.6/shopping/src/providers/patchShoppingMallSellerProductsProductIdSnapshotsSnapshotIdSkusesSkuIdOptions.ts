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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductSnapshotSkusOptionTransformer } from "../transformers/ShoppingMallProductSnapshotSkusOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdSnapshotsSnapshotIdSkusesSkuIdOptions(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshotSkusOption.IRequest;
}): Promise<IPageIShoppingMallProductSnapshotSkusOption> {
  // Step 1: Validate product exists and seller owns it
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, shopping_mall_seller_id: true, deleted_at: true },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // Step 2: Validate snapshot belongs to the product
  await MyGlobal.prisma.shopping_mall_product_snapshots.findFirstOrThrow({
    where: { id: props.snapshotId, product_id: props.productId },
    select: { id: true },
  });
  // Step 3: Validate sku belongs to the snapshot
  await MyGlobal.prisma.shopping_mall_product_snapshot_skuses.findFirstOrThrow({
    where: { id: props.skuId, product_snapshot_id: props.snapshotId },
    select: { id: true },
  });
  // Step 4: Build where clause
  const whereInput = {
    product_snapshot_skus_id: props.skuId,
    ...(props.body.key !== undefined && {
      key: { contains: props.body.key, mode: "insensitive" as const },
    }),
    ...(props.body.value !== undefined && {
      value: { contains: props.body.value, mode: "insensitive" as const },
    }),
  } satisfies Prisma.shopping_mall_product_snapshot_skus_optionsWhereInput;
  // Step 5: Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 6: Query data and count sequentially
  const data =
    await MyGlobal.prisma.shopping_mall_product_snapshot_skus_options.findMany({
      where: whereInput,
      orderBy: { sequence: "asc" },
      skip,
      take: limit,
      ...ShoppingMallProductSnapshotSkusOptionTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_product_snapshot_skus_options.count({
      where: whereInput,
    });
  // Step 7 & 8: Transform and return page
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallProductSnapshotSkusOptionTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
