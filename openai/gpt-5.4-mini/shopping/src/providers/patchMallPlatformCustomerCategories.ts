import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerCategories(props: {
  customer: CustomerPayload;
  body: IMallPlatformCategory.IRequest;
}): Promise<IPageIMallPlatformCategory.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.mall_platform_categoriesWhereInput = {
    deleted_at: null,
    ...(props.body.parentCategoryId === undefined
      ? {}
      : props.body.parentCategoryId === null
        ? { parent_category_id: null }
        : { parent_category_id: props.body.parentCategoryId }),
    ...(props.body.search === undefined
      ? {}
      : {
          OR: [
            { name: { contains: props.body.search, mode: "insensitive" } },
            {
              description: { contains: props.body.search, mode: "insensitive" },
            },
          ],
        }),
  };
  const categories = await MyGlobal.prisma.mall_platform_categories.findMany({
    where,
    orderBy: [{ parent_category_id: "asc" }, { name: "asc" }],
    skip,
    take: limit,
    select: {
      id: true,
      parent_category_id: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      parentCategory: {
        select: {
          id: true,
          parent_category_id: true,
          name: true,
          description: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  const total: number = await MyGlobal.prisma.mall_platform_categories.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(categories, async (category) => {
      const parentCategory: IMallPlatformCategory.ISummary | null =
        category.parentCategory === null ||
        category.parentCategory.deleted_at !== null
          ? null
          : {
              id: category.parentCategory.id,
              parentCategory: null,
              name: category.parentCategory.name,
              description: category.parentCategory.description,
              createdAt: toISOStringSafe(category.parentCategory.created_at),
              updatedAt: toISOStringSafe(category.parentCategory.updated_at),
              deletedAt:
                category.parentCategory.deleted_at === null
                  ? null
                  : toISOStringSafe(category.parentCategory.deleted_at),
            };
      return {
        id: category.id,
        parentCategory,
        name: category.name,
        description: category.description,
        createdAt: toISOStringSafe(category.created_at),
        updatedAt: toISOStringSafe(category.updated_at),
        deletedAt:
          category.deleted_at === null
            ? null
            : toISOStringSafe(category.deleted_at),
      } satisfies IMallPlatformCategory.ISummary;
    }),
  };
}
