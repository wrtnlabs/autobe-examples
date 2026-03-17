import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallProductAtSummaryTransformer } from "../transformers/ShoppingMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminSellersSellerIdProducts(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  // Step 1: Verify seller exists (auto 404 if not found)
  await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 2: Build where clause
  const whereInput = {
    shopping_mall_seller_id: props.sellerId,
    // Admin can include deleted products via the includeDeleted flag
    ...(props.body.includeDeleted !== true && { deleted_at: null }),
    // Keyword search on name
    ...(props.body.keyword !== undefined &&
      props.body.keyword !== null &&
      props.body.keyword !== "" && {
        name: { contains: props.body.keyword, mode: "insensitive" as const },
      }),
    // Category filter
    ...(props.body.categoryId !== undefined &&
      props.body.categoryId !== null && {
        shopping_mall_category_id: props.body.categoryId,
      }),
    // Price range
    ...((props.body.minPrice !== undefined && props.body.minPrice !== null) ||
    (props.body.maxPrice !== undefined && props.body.maxPrice !== null)
      ? {
          base_price: {
            ...(props.body.minPrice !== undefined &&
              props.body.minPrice !== null && { gte: props.body.minPrice }),
            ...(props.body.maxPrice !== undefined &&
              props.body.maxPrice !== null && { lte: props.body.maxPrice }),
          },
        }
      : {}),
    // Date range
    ...((props.body.createdAfter !== undefined &&
      props.body.createdAfter !== null) ||
    (props.body.createdBefore !== undefined &&
      props.body.createdBefore !== null)
      ? {
          created_at: {
            ...(props.body.createdAfter !== undefined &&
              props.body.createdAfter !== null && {
                gte: new Date(props.body.createdAfter),
              }),
            ...(props.body.createdBefore !== undefined &&
              props.body.createdBefore !== null && {
                lte: new Date(props.body.createdBefore),
              }),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_productsWhereInput;
  // Step 3: Build orderBy clause
  const sortDirection =
    props.body.sortDirection === "ASC" ? ("asc" as const) : ("desc" as const);
  const orderByInput = (
    props.body.sort === "name"
      ? { name: sortDirection }
      : props.body.sort === "basePrice"
        ? { base_price: sortDirection }
        : { created_at: sortDirection }
  ) satisfies Prisma.shopping_mall_productsOrderByWithRelationInput;
  // Step 4: Query data and count sequentially
  const data = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...ShoppingMallProductAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: whereInput,
  });
  // Step 5: Transform results
  const summaries = await ArrayUtil.asyncMap(
    data,
    ShoppingMallProductAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: summaries,
  } satisfies IPageIShoppingMallProduct.ISummary;
}
