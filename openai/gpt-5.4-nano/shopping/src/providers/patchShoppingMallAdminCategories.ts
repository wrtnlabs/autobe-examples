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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCategoryAtSummaryTransformer } from "../transformers/ShoppingMallCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminCategories(props: {
  admin: AdminPayload;
  body: IShoppingMallCategory.IRequest;
}): Promise<IPageIShoppingMallCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const where = {
    deleted_at: null,
    ...(props.body.visibility !== undefined && {
      visibility: props.body.visibility,
    }),
    ...(props.body.slug !== undefined && { slug: props.body.slug }),
    ...(props.body.name !== undefined && { name: props.body.name }),
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
    ...(props.body.parent_category_id !== undefined && {
      parent_category_id: props.body.parent_category_id,
    }),
  } satisfies Prisma.shopping_mall_categoriesWhereInput;
  const orderBy = (() => {
    const direction = props.body.sortDirection ?? "asc";
    const column = props.body.sortBy ?? "display_order";
    if (column === "display_order") return { display_order: direction };
    if (column === "created_at") return { created_at: direction };
    return { updated_at: direction };
  })() satisfies Prisma.shopping_mall_categoriesOrderByWithRelationInput;
  const skip = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_categories.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...ShoppingMallCategoryAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.shopping_mall_categories.count({ where }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      rows,
      ShoppingMallCategoryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  } satisfies IPageIShoppingMallCategory.ISummary;
}
