import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import { IPageIDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardCategories(props: {
  body: IDiscussionBoardArticleCategory.IRequest;
}): Promise<IPageIDiscussionBoardArticleCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const searchCondition = props.body.search
    ? {
        OR: [
          {
            name: {
              contains: props.body.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            description: {
              contains: props.body.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }
    : {};

  const sortBy = props.body.sort_by ?? "sort_order";
  const order = props.body.order ?? "asc";

  const orderByClause =
    sortBy === "sort_order"
      ? { sort_order: order }
      : sortBy === "name"
        ? { name: order }
        : { created_at: order };

  const [categories, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_categories.findMany({
      where: searchCondition,
      orderBy: orderByClause,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_article_categories.count({
      where: searchCondition,
    }),
  ]);

  return {
    data: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      sort_order: category.sort_order,
      created_at: toISOStringSafe(category.created_at),
      updated_at: toISOStringSafe(category.updated_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
