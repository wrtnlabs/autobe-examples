import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallCategories(props: {
  body: IShoppingMallCategory.IRequest;
}): Promise<IPageIShoppingMallCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_categories.findMany({
      where: {
        ...(props.body.search && {
          name: {
            contains: props.body.search,
            mode: Prisma.QueryMode.insensitive,
          },
        }),
        ...(props.body.parent_id !== undefined && {
          parent_id: props.body.parent_id,
        }),
        ...(props.body.status && {
          status: props.body.status,
        }),
      },
      orderBy: {
        [props.body.sort_by ?? "name"]: props.body.sort_direction ?? "asc",
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_categories.count({
      where: {
        ...(props.body.search && {
          name: {
            contains: props.body.search,
            mode: Prisma.QueryMode.insensitive,
          },
        }),
        ...(props.body.parent_id !== undefined && {
          parent_id: props.body.parent_id,
        }),
        ...(props.body.status && {
          status: props.body.status,
        }),
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? undefined,
      image_url: category.image_url ?? undefined,
      parent_id: category.parent_id ?? undefined,
      status: category.status,
      display_order: category.display_order,
      product_count: category.product_count,
      created_at: toISOStringSafe(category.created_at),
      updated_at: toISOStringSafe(category.updated_at),
    })),
  };
}
