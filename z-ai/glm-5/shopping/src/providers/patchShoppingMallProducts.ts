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
import { ShoppingMallProductAtSummaryTransformer } from "../transformers/ShoppingMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProducts(props: {
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Base WHERE: active products from approved, non-suspended, non-banned sellers with non-deleted categories
  const baseWhere: Prisma.shopping_mall_productsWhereInput = {
    deleted_at: null,
    category: { deleted_at: null },
    seller: {
      approval_status: "approved",
      suspended: false,
      banned: false,
      deleted_at: null,
    },
  };
  // Category filter with subcategory expansion
  let categoryIds: string[] | undefined;
  if (props.body.categoryId !== undefined) {
    const subcategories =
      await MyGlobal.prisma.shopping_mall_categories.findMany({
        where: { parent_id: props.body.categoryId },
        select: { id: true },
      });
    categoryIds = [props.body.categoryId, ...subcategories.map((c) => c.id)];
  }
  // Build final WHERE clause
  const whereInput: Prisma.shopping_mall_productsWhereInput = {
    ...baseWhere,
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        name: { contains: props.body.search, mode: "insensitive" },
      }),
    ...(categoryIds !== undefined && {
      shopping_mall_category_id: { in: categoryIds },
    }),
    ...(props.body.minPrice !== undefined && {
      base_price: { gte: props.body.minPrice },
    }),
    ...(props.body.maxPrice !== undefined && {
      base_price: { lte: props.body.maxPrice },
    }),
    ...(props.body.inStockOnly === true && {
      variants: {
        some: {
          deleted_at: null,
          inventoryRecords: {
            some: {},
          },
        },
      },
    }),
  };
  // Determine sort order
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = typia.assert<"asc" | "desc">(
    props.body.sortOrder ?? "desc",
  );
  const orderByInput: Prisma.shopping_mall_productsOrderByWithRelationInput =
    sortBy === "price"
      ? { base_price: sortOrder }
      : sortBy === "name"
        ? { name: sortOrder }
        : { created_at: sortOrder };
  // Query products
  const products = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallProductAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      products,
      ShoppingMallProductAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
