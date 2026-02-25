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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorCategories(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallCategory.IRequest;
}): Promise<IPageIShoppingMallCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: any = {
    deleted_at: null,
    ...(props.body.name
      ? {
          name: {
            contains: props.body.name,
            mode: "insensitive" as Prisma.QueryMode,
          },
        }
      : {}),
    ...(props.body.parentCategoryId === undefined
      ? {}
      : { parent_category_id: props.body.parentCategoryId }),
  };
  const [categories, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_categories.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        parentCategory: {
          select: {
            id: true,
            name: true,
            description: true,
            parentCategory: {
              select: {
                id: true,
                name: true,
                description: true,
                parentCategory: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    parentCategory: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        parentCategory: false,
                        deleted_at: true,
                      },
                    },
                    deleted_at: true,
                  },
                },
                deleted_at: true,
              },
            },
            deleted_at: true,
          },
        },
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_categories.count({ where }),
  ]);
  function transformCategory(
    category: (typeof categories)[number],
  ): IShoppingMallCategory.ISummary {
    function transformParentCategory(
      parent: typeof category.parentCategory | null | undefined,
    ): IShoppingMallCategory.ISummary | null {
      if (!parent) {
        return null;
      }
      return {
        id: parent.id,
        name: parent.name,
        description: parent.description,
        parentCategory: transformParentCategory(parent.parentCategory ?? null),
        deleted_at: parent.deleted_at
          ? toISOStringSafe(parent.deleted_at)
          : null,
      } satisfies IShoppingMallCategory.ISummary;
    }
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      parentCategory: transformParentCategory(category.parentCategory ?? null),
      deleted_at: category.deleted_at
        ? toISOStringSafe(category.deleted_at)
        : null,
    } satisfies IShoppingMallCategory.ISummary;
  }
  return {
    data: categories.map(transformCategory),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  } satisfies IPageIShoppingMallCategory.ISummary;
}
