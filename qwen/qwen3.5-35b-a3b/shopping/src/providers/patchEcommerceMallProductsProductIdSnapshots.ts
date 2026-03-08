import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallProductSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProductsProductIdSnapshots(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductSnapshot.IRequest;
}): Promise<IPageIEcommerceMallProductSnapshot.ISummary> {
  // Validate product exists
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Parse sort parameters
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  // Build where clause with date filtering
  const whereInput = {
    product_id: props.productId,
    ...(props.body.startDate !== undefined && {
      created_at: { gte: props.body.startDate },
    }),
    ...(props.body.endDate !== undefined && {
      created_at: { lte: props.body.endDate },
    }),
  } satisfies Prisma.ecommerce_mall_product_snapshotsWhereInput;
  // Build order by
  const orderByInput = {
    [sortBy]: sortOrder === "asc" ? ("asc" as const) : ("desc" as const),
  } satisfies Prisma.ecommerce_mall_product_snapshotsOrderByWithRelationInput;
  // Build select based on includeCategory flag
  const selectInput = {
    ...EcommerceMallProductSnapshotAtSummaryTransformer.select(),
    ...(props.body.includeCategory === true
      ? {
          category: {
            select: {
              id: true,
              name: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              description: true,
              is_leaf: true,
              parent: {
                select: {
                  id: true,
                  name: true,
                  is_leaf: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              children: true,
              snapshots: true,
              products: true,
              productSnapshots: true,
            },
          },
        }
      : {}),
  };
  const queryArgs = {
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: selectInput.select,
  } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_product_snapshots.findMany(queryArgs),
    MyGlobal.prisma.ecommerce_mall_product_snapshots.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallProductSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
