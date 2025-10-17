import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallShoppingMallCategories(props: {
  body: IShoppingMallCategory.IRequest;
}): Promise<IPageIShoppingMallCategory> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const result = await Promise.all([
    MyGlobal.prisma.shopping_mall_categories.findMany({
      where: {
        deleted_at: null,
        ...(body.parent_id !== undefined
          ? body.parent_id === null
            ? { parent_id: null }
            : { parent_id: body.parent_id }
          : {}),
        ...(body.search !== undefined && {
          OR: [
            { code: { contains: body.search } },
            { name: { contains: body.search } },
          ],
        }),
      },
      orderBy:
        body.sort === "asc"
          ? { display_order: "asc" }
          : { display_order: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_categories.count({
      where: {
        deleted_at: null,
        ...(body.parent_id !== undefined
          ? body.parent_id === null
            ? { parent_id: null }
            : { parent_id: body.parent_id }
          : {}),
        ...(body.search !== undefined && {
          OR: [
            { code: { contains: body.search } },
            { name: { contains: body.search } },
          ],
        }),
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: result[1],
      pages: result[1] === 0 ? 0 : Math.ceil(result[1] / limit),
    },
    data: result[0].map((record) => ({
      id: record.id,
      parent_id:
        record.parent_id === null ? null : (record.parent_id ?? undefined),
      code: record.code,
      name: record.name,
      description: record.description ?? undefined,
      display_order: record.display_order,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    })),
  };
}
