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

export async function patchShoppingMallCategoriesCategoryIdChildren(props: {
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallCategory.IRequest;
}): Promise<IPageIShoppingMallCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const [children, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_categories.findMany({
      where: {
        parent_id: props.categoryId,
        ...(props.body.status !== undefined && { status: props.body.status }),
        ...(props.body.search && {
          name: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }),
      },
      orderBy: props.body.sort_by
        ? {
            [props.body.sort_by]: props.body.sort_direction ?? "asc",
          }
        : { display_order: "asc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_categories.count({
      where: {
        parent_id: props.categoryId,
        ...(props.body.status !== undefined && { status: props.body.status }),
        ...(props.body.search && {
          name: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }),
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: totalPages,
    },
    data: children.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description:
        category.description === null ? undefined : category.description,
      image_url: category.image_url === null ? undefined : category.image_url,
      parent_id: category.parent_id === null ? undefined : category.parent_id,
      status: category.status,
      display_order: category.display_order,
      product_count: category.product_count,
      created_at: toISOStringSafe(category.created_at),
      updated_at: toISOStringSafe(category.updated_at),
    })),
  };
}
