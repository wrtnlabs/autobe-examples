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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallProductSnapshotSkusAtSummaryTransformer } from "../transformers/ShoppingMallProductSnapshotSkusAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminSnapshotsSnapshotIdSkuses(props: {
  admin: AdminPayload;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshotSkus.IRequest;
}): Promise<IPageIShoppingMallProductSnapshotSkus.ISummary> {
  // Step 1: Validate snapshot exists (returns 404 if not found)
  await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
    where: { id: props.snapshotId },
    select: { id: true },
  });
  // Step 2: Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 3: Build option filter AND conditions
  const optionAndConditions: Prisma.shopping_mall_product_snapshot_skusesWhereInput[] =
    (props.body.optionFilters ?? []).map((filter) => {
      const optionWhere: Prisma.shopping_mall_product_snapshot_skus_optionsWhereInput =
        {
          ...(filter.key !== undefined && {
            key: { contains: filter.key, mode: "insensitive" },
          }),
          ...(filter.value !== undefined && {
            value: { contains: filter.value, mode: "insensitive" },
          }),
        };
      return {
        options: { some: optionWhere },
      } satisfies Prisma.shopping_mall_product_snapshot_skusesWhereInput;
    });
  // Step 4: Build price filter (merge gte and lte into one object)
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
  // Step 5: Build main where clause
  const whereInput = {
    product_snapshot_id: props.snapshotId,
    ...(props.body.skuCode !== undefined && {
      sku_code: { contains: props.body.skuCode, mode: "insensitive" as const },
    }),
    ...(priceFilter !== undefined && { price: priceFilter }),
    ...(optionAndConditions.length > 0 && {
      AND: optionAndConditions,
    }),
  } satisfies Prisma.shopping_mall_product_snapshot_skusesWhereInput;
  // Step 6: Query data and count sequentially
  const data =
    await MyGlobal.prisma.shopping_mall_product_snapshot_skuses.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "asc" },
      ...ShoppingMallProductSnapshotSkusAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_product_snapshot_skuses.count({
      where: whereInput,
    });
  // Step 7: Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    ShoppingMallProductSnapshotSkusAtSummaryTransformer.transform,
  );
  // Step 8: Return paginated result
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformed,
  };
}
