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

export async function patchShoppingMallProductsProductIdCategories(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductCategory.IRequest;
}): Promise<IPageIShoppingMallProductCategory.ISummary> {
  const search = props.body || "";

  // Defaults per operation spec: page 1, limit 10 if not specified (body is string, so we can't extract pagination)
  // The specification says body is IRequest = string, so pagination must be handled at a higher layer or isn't allowed
  // We treat this as a search term and use fixed pagination defaults
  const page = 1;
  const limit = 10;

  const whereClause = {
    shopping_mall_product_id: props.productId,
  };

  const categoryWhereClause = search
    ? {
        name: {
          contains: search,
          mode: "insensitive",
        },
      }
    : {};

  const [categories, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_categories.findMany({
      where: whereClause,
      include: {
        category: true,
      },
      orderBy: {
        category: {
          display_order: "asc",
          name: "asc",
        },
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_product_categories.count({
      where: whereClause,
    }),
  ]);

  const data = categories.map((item) => {
    const category = item.category;
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description:
        category.description === null ? undefined : category.description,
      parent_category_id:
        category.parent_category_id === null
          ? undefined
          : category.parent_category_id,
      is_active: category.is_active,
      display_order: category.display_order,
      created_at: toISOStringSafe(category.created_at),
      updated_at: toISOStringSafe(category.updated_at),
    };
  });

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
