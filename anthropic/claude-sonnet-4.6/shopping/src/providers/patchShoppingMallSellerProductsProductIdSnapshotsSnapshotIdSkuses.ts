import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotSkus";
import { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductSnapshotSkusAtSummaryTransformer } from "../transformers/ShoppingMallProductSnapshotSkusAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdSnapshotsSnapshotIdSkuses(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshotSkus.IRequest;
}): Promise<IPageIShoppingMallProductSnapshotSkus.ISummary> {
  // Step 1: Validate product existence and seller ownership
  // Per spec [180]: sellers can view snapshots of deleted products too, so no deleted_at filter
  await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
    },
    select: { id: true },
  });
  // Step 2: Validate snapshot belongs to this product
  await MyGlobal.prisma.shopping_mall_product_snapshots.findFirstOrThrow({
    where: {
      id: props.snapshotId,
      product_id: props.productId,
    },
    select: { id: true },
  });
  // Step 3: Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 4: Build price filter
  const priceFilter: Prisma.FloatFilter | undefined =
    props.body.minPrice !== undefined || props.body.maxPrice !== undefined
      ? {
          ...(props.body.minPrice !== undefined && {
            gte: props.body.minPrice,
          }),
          ...(props.body.maxPrice !== undefined && {
            lte: props.body.maxPrice,
          }),
        }
      : undefined;
  // Step 5: Build AND conditions for option filters
  const optionAndConditions: Prisma.shopping_mall_product_snapshot_skusesWhereInput[] =
    props.body.optionFilters !== undefined &&
    props.body.optionFilters.length > 0
      ? props.body.optionFilters.map((f) => ({
          options: {
            some: {
              ...(f.key !== undefined && {
                key: { contains: f.key, mode: "insensitive" as const },
              }),
              ...(f.value !== undefined && {
                value: { contains: f.value, mode: "insensitive" as const },
              }),
            },
          },
        }))
      : [];
  // Step 6: Compose the full WHERE input
  const whereInput: Prisma.shopping_mall_product_snapshot_skusesWhereInput = {
    product_snapshot_id: props.snapshotId,
    ...(props.body.skuCode !== undefined && {
      sku_code: { contains: props.body.skuCode, mode: "insensitive" as const },
    }),
    ...(priceFilter !== undefined && { price: priceFilter }),
    ...(optionAndConditions.length > 0 && { AND: optionAndConditions }),
  };
  // Step 7: Query data and count sequentially (NOT Promise.all)
  const data =
    await MyGlobal.prisma.shopping_mall_product_snapshot_skuses.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallProductSnapshotSkusAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_product_snapshot_skuses.count({
      where: whereInput,
    });
  // Step 8: Transform and return paginated result
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallProductSnapshotSkusAtSummaryTransformer.transform,
    ),
  };
}
