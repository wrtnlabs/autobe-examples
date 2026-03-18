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
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.shopping_mall_categoriesWhereInput = {
    deleted_at: null,
    ...(props.body.parent_id === undefined
      ? {}
      : props.body.parent_id === null
        ? { parent_id: null }
        : { parent_id: props.body.parent_id }),
    ...(props.body.search === undefined || props.body.search.length === 0
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
  const data = await MyGlobal.prisma.shopping_mall_categories.findMany({
    where,
    skip,
    take: limit,
    orderBy: [{ created_at: "asc" }, { name: "asc" }],
    select: {
      id: true,
      parent: {
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
              parent: true,
            },
          },
        },
      },
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const records: number = await MyGlobal.prisma.shopping_mall_categories.count({
    where,
  });
  return {
    data: data.map((record) => ({
      id: record.id,
      parent:
        record.parent === null
          ? null
          : {
              id: record.parent.id,
              parent:
                record.parent.parent === null
                  ? null
                  : {
                      id: record.parent.parent.id,
                      parent: null,
                      name: record.parent.parent.name,
                      description: record.parent.parent.description,
                      created_at: toISOStringSafe(
                        record.parent.parent.created_at,
                      ),
                      updated_at: toISOStringSafe(
                        record.parent.parent.updated_at,
                      ),
                      deleted_at:
                        record.parent.parent.deleted_at === null
                          ? null
                          : toISOStringSafe(record.parent.parent.deleted_at),
                    },
              name: record.parent.name,
              description: record.parent.description,
              created_at: toISOStringSafe(record.parent.created_at),
              updated_at: toISOStringSafe(record.parent.updated_at),
              deleted_at:
                record.parent.deleted_at === null
                  ? null
                  : toISOStringSafe(record.parent.deleted_at),
            },
      name: record.name,
      description: record.description,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at:
        record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
    })),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  };
}
