import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallProductSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsProductIdSnapshots(props: {
  productId: string;
  body: IShoppingMallProductSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductSnapshot.ISummary> {
  // Validate product exists
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause with date range filters
  const whereClause = {
    shopping_mall_product_id: props.productId,
    ...(props.body.created_from !== undefined &&
    props.body.created_from !== null &&
    props.body.created_to !== undefined &&
    props.body.created_to !== null
      ? {
          created_at: {
            gte: new Date(props.body.created_from),
            lte: new Date(props.body.created_to),
          },
        }
      : props.body.created_from !== undefined &&
          props.body.created_from !== null
        ? {
            created_at: {
              gte: new Date(props.body.created_from),
            },
          }
        : props.body.created_to !== undefined && props.body.created_to !== null
          ? {
              created_at: {
                lte: new Date(props.body.created_to),
              },
            }
          : {}),
  } satisfies Prisma.shopping_mall_product_snapshotsWhereInput;
  // Query snapshots with pagination
  const snapshots =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...ShoppingMallProductSnapshotAtSummaryTransformer.select(),
    });
  // Count total records
  const total = await MyGlobal.prisma.shopping_mall_product_snapshots.count({
    where: whereClause,
  });
  // Transform and return paginated response
  return {
    data: await ArrayUtil.asyncMap(
      snapshots,
      ShoppingMallProductSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
