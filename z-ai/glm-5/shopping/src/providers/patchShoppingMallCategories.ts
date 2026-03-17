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
  const sort = props.body.sort ?? "name";
  const direction = props.body.direction ?? "asc";
  const orderByInput = (
    sort === "createdAt" ? { created_at: direction } : { name: direction }
  ) satisfies Prisma.shopping_mall_categoriesOrderByWithRelationInput;
  const whereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined && {
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
    ...(props.body.name !== undefined && {
      name: { contains: props.body.name, mode: "insensitive" as const },
    }),
    ...(props.body.parentId !== undefined && {
      parent_id: props.body.parentId,
    }),
    ...(props.body.hierarchyLevel !== undefined &&
      props.body.parentId === undefined && {
        parent_id:
          props.body.hierarchyLevel === "top-level" ? null : { not: null },
      }),
  } satisfies Prisma.shopping_mall_categoriesWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_categories.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      parent: {
        select: {
          id: true,
          name: true,
          description: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      } satisfies Prisma.shopping_mall_categoriesFindManyArgs,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_categories.count({
    where: whereInput,
  });
  return {
    data: data.map(
      (category) =>
        ({
          id: category.id,
          name: category.name,
          description: category.description,
          parent: category.parent
            ? {
                id: category.parent.id,
                name: category.parent.name,
                description: category.parent.description,
                parent: null,
                created_at: category.parent.created_at.toISOString(),
                updated_at: category.parent.updated_at.toISOString(),
                deleted_at: category.parent.deleted_at?.toISOString() ?? null,
              }
            : null,
          created_at: category.created_at.toISOString(),
          updated_at: category.updated_at.toISOString(),
          deleted_at: category.deleted_at?.toISOString() ?? null,
        }) satisfies IShoppingMallCategory.ISummary,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
