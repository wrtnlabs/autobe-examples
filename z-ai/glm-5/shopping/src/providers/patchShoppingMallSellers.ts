import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSellerAtSummaryTransformer } from "../transformers/ShoppingMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellers(props: {
  body: IShoppingMallSeller.IRequest;
}): Promise<IPageIShoppingMallSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build created_at range filter
  const createdAtFilter = {
    ...(props.body.createdAtFrom !== undefined &&
      props.body.createdAtFrom !== null && {
        gte: new Date(props.body.createdAtFrom),
      }),
    ...(props.body.createdAtTo !== undefined &&
      props.body.createdAtTo !== null && {
        lte: new Date(props.body.createdAtTo),
      }),
  };
  // Build WHERE clause
  const whereInput = {
    deleted_at: null,
    ...(props.body.shopName !== undefined &&
      props.body.shopName !== null && {
        shop_name: {
          contains: props.body.shopName,
          mode: "insensitive" as const,
        },
      }),
    ...(props.body.approvalStatus !== undefined &&
      props.body.approvalStatus !== null && {
        approval_status: props.body.approvalStatus,
      }),
    ...(props.body.suspended !== undefined &&
      props.body.suspended !== null && {
        suspended: props.body.suspended,
      }),
    ...(props.body.banned !== undefined &&
      props.body.banned !== null && {
        banned: props.body.banned,
      }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
  } satisfies Prisma.shopping_mall_sellersWhereInput;
  // Determine sort order
  const orderByInput = (
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : props.body.sort === "shop_name_asc"
        ? { shop_name: "asc" as const }
        : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_sellersOrderByWithRelationInput;
  // Execute queries sequentially (not Promise.all to avoid connection pool issues)
  const data = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallSellerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_sellers.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallSellerAtSummaryTransformer.transform,
    ),
  };
}
