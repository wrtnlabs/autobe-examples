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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCategories(props: {
  body: IShoppingMallCategory.IRequest;
}): Promise<IPageIShoppingMallCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_categoriesWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.parent_category_id !== undefined && {
      parent_category_id: props.body.parent_category_id,
    }),
  } satisfies Prisma.shopping_mall_categoriesWhereInput;
  const validSortFields = ["created_at", "updated_at", "name"] as const;
  const sortParts = props.body.sort?.split(",") ?? [];
  const rawSortField = sortParts[0] ?? "created_at";
  const sortField = validSortFields.includes(
    rawSortField as (typeof validSortFields)[number],
  )
    ? (rawSortField as (typeof validSortFields)[number])
    : "created_at";
  const rawSortDir = sortParts[1] ?? "desc";
  const sortDir: "asc" | "desc" = rawSortDir === "asc" ? "asc" : "desc";
  const orderByInput: Prisma.shopping_mall_categoriesOrderByWithRelationInput =
    {
      [sortField]: sortDir,
    } satisfies Prisma.shopping_mall_categoriesOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_categories.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        name: true,
        description: true,
        parent: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
          },
        },
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_categories.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map(
      (category) =>
        ({
          id: category.id as string & tags.Format<"uuid">,
          name: category.name,
          description: category.description ?? null,
          parent: category.parent
            ? ({
                id: category.parent.id as string & tags.Format<"uuid">,
                name: category.parent.name,
                description: category.parent.description ?? null,
                created_at: toISOStringSafe(category.parent.created_at),
              } satisfies IShoppingMallCategory.ISummary)
            : null,
          created_at: toISOStringSafe(category.created_at),
        }) satisfies IShoppingMallCategory.ISummary,
    ),
  } satisfies IPageIShoppingMallCategory.ISummary;
}
