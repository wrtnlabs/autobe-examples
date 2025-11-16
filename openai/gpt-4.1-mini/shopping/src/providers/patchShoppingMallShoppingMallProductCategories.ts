import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallShoppingMallProductCategories(props: {
  body: IShoppingMallProductCategory.IRequest;
}): Promise<IPageIShoppingMallProductCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where: Prisma.shopping_mall_product_categoriesWhereInput = {
    AND: [
      {
        OR: props.body.search
          ? [
              { code: { contains: props.body.search } },
              { name: { contains: props.body.search } },
            ]
          : undefined,
      },
      { parent_category_id: props.body.parentCategoryCode ?? null },
      props.body.createdFrom || props.body.createdTo
        ? {
            created_at: {
              gte: props.body.createdFrom ?? undefined,
              lte: props.body.createdTo ?? undefined,
            },
          }
        : undefined,
    ].filter((cond) => cond !== undefined),
  };

  const orderBy: Prisma.shopping_mall_product_categoriesOrderByWithRelationInput =
    props.body.sortBy
      ? {
          [props.body.sortBy]: props.body.sortOrder ?? "asc",
        }
      : { created_at: "desc" };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_categories.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_product_categories.count({ where }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      parent_id: item.parent_id ?? undefined,
    })),
  };
}
