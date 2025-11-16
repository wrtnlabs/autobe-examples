import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";
import { IPageIShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallArticleCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallShoppingMallArticleCategories(props: {
  body: IShoppingMallArticleCategory.IRequest;
}): Promise<IPageIShoppingMallArticleCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 30;
  const skip = (page - 1) * limit;

  // Fix 'mode' in 'where.name' with satisfies for QueryMode
  const where = {
    deleted_at: null as null,
    ...(props.body.search != null && {
      name: {
        contains: props.body.search,
        mode: "insensitive" satisfies Prisma.QueryMode as Prisma.QueryMode,
      },
    }),
    ...(props.body.parent_id !== undefined
      ? { parent_id: props.body.parent_id }
      : {}),
  };

  const orderBy =
    props.body.sort_by && props.body.sort_order
      ? { [props.body.sort_by]: props.body.sort_order }
      : { created_at: "desc" as "desc" };

  const [categories, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_article_categories.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: { parent: true },
    }),
    MyGlobal.prisma.shopping_mall_article_categories.count({ where }),
  ]);

  return {
    data: categories.map((category) => {
      // Type assertion for category with included parent to fix property access errors
      const cat = category as typeof category & {
        parent: null | {
          id: string & tags.Format<"uuid">;
          name: string;
          created_at: Date;
          updated_at: Date;
          deleted_at: Date | null;
          // no nested parent
        };
      };

      return {
        id: cat.id,
        name: cat.name,
        parent:
          cat.parent === null
            ? null
            : {
                id: cat.parent.id,
                name: cat.parent.name,
                parent: null,
                created_at: toISOStringSafe(cat.parent.created_at),
                updated_at: toISOStringSafe(cat.parent.updated_at),
                deleted_at: cat.parent.deleted_at
                  ? toISOStringSafe(cat.parent.deleted_at)
                  : null,
              },
        created_at: toISOStringSafe(cat.created_at),
        updated_at: toISOStringSafe(cat.updated_at),
        deleted_at: cat.deleted_at ? toISOStringSafe(cat.deleted_at) : null,
      };
    }),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
