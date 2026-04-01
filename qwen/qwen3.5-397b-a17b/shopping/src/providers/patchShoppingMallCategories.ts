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

export async function patchShoppingMallCategories(props: {
  body: IShoppingMallCategory.IRequest;
}): Promise<IPageIShoppingMallCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_categoriesWhereInput = {
    deleted_at: null,
    ...(props.body.parent_id !== undefined &&
      props.body.parent_id !== null && {
        parent_id: props.body.parent_id,
      }),
    ...(props.body.parent_id === null && {
      parent_id: null,
    }),
    ...(props.body.search && {
      name: {
        contains: props.body.search,
      },
    }),
  } satisfies Prisma.shopping_mall_categoriesWhereInput;
  const sortField = props.body.sort?.startsWith("-")
    ? props.body.sort.substring(1)
    : (props.body.sort ?? "created_at");
  const sortDir = props.body.sort?.startsWith("-") ? "desc" : "asc";
  const orderByInput = {
    [sortField]: sortDir,
  } satisfies Prisma.shopping_mall_categoriesOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_categories.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallCategoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_categories.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ShoppingMallCategoryAtSummaryTransformer.transformAll(data),
  };
}
