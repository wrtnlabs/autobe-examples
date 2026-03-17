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
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.name !== undefined && {
      name: { contains: props.body.name, mode: "insensitive" },
    }),
    ...(props.body.parentId !== undefined
      ? props.body.parentId === null
        ? { parent_id: null }
        : { parent_id: props.body.parentId }
      : {}),
  } satisfies Prisma.shopping_mall_categoriesWhereInput;
  const orderByDir = props.body.order ?? "asc";
  const orderByInput = (
    props.body.sort === "name"
      ? { name: orderByDir }
      : { created_at: orderByDir }
  ) satisfies Prisma.shopping_mall_categoriesOrderByWithRelationInput;
  const records = await MyGlobal.prisma.shopping_mall_categories.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      parent_id: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
      children: ShoppingMallCategoryAtSummaryTransformer.select(),
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_categories.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(records, async (record) => {
    const children = await ArrayUtil.asyncMap(
      record.children,
      ShoppingMallCategoryAtSummaryTransformer.transform,
    );
    return {
      id: record.id,
      parent_id: record.parent_id,
      name: record.name,
      description: record.description ?? null,
      children,
      created_at: record.created_at.toISOString(),
      updated_at: record.updated_at.toISOString(),
    } satisfies IShoppingMallCategory.ISummary;
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
