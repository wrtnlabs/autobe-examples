import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCategoryAtSummaryTransformer } from "../transformers/ShoppingMallCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCategoriesCategoryIdSubcategories(props: {
  categoryId: string;
  body: IShoppingMallCategory.IRequest;
}): Promise<IPageIShoppingMallCategory.ISummary> {
  // Step 1: Validate parent category exists and is not soft-deleted
  const parent =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: {
        id: props.categoryId,
        deleted_at: null,
      },
      select: { id: true, parent_id: true },
    });
  // Step 2: If parent is itself a subcategory, return empty list
  if (parent.parent_id !== null) {
    const page = props.body.page ?? 1;
    const limit = props.body.limit ?? 20;
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // Step 3: Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 4: Build WHERE clause
  const whereInput = {
    parent_id: props.categoryId,
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" as const } },
        {
          description: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
    ...(props.body.name && {
      name: { contains: props.body.name, mode: "insensitive" as const },
    }),
  } satisfies Prisma.shopping_mall_categoriesWhereInput;
  // Step 5: Build ORDER BY
  const orderByInput = (
    props.body.sort === "createdAt"
      ? { created_at: (props.body.direction ?? "asc") as "asc" | "desc" }
      : { name: (props.body.direction ?? "asc") as "asc" | "desc" }
  ) satisfies Prisma.shopping_mall_categoriesOrderByWithRelationInput;
  // Step 6: Execute findMany query
  const data = await MyGlobal.prisma.shopping_mall_categories.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallCategoryAtSummaryTransformer.select(),
  });
  // Step 7: Execute count query
  const total = await MyGlobal.prisma.shopping_mall_categories.count({
    where: whereInput,
  });
  // Step 8: Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCategoryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
