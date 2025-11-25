import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function patchDiscussionBoardArticles(props: {
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {
    deleted_at: null,
  };

  if (props.body.search) {
    whereCondition.OR = [
      { title: { contains: props.body.search } },
      { body: { contains: props.body.search } },
    ];
  }

  if (props.body.discussion_board_article_category_id) {
    whereCondition.discussion_board_article_category_id =
      props.body.discussion_board_article_category_id;
  }

  if (props.body.status) {
    whereCondition.status = props.body.status;
  }

  if (props.body.discussion_board_member_id) {
    whereCondition.discussion_board_member_id =
      props.body.discussion_board_member_id;
  }

  if (props.body.published_after || props.body.published_before) {
    const publishedAtCondition: Record<string, unknown> = {};
    if (props.body.published_after) {
      publishedAtCondition.gte = new Date(props.body.published_after);
    }
    if (props.body.published_before) {
      publishedAtCondition.lte = new Date(props.body.published_before);
    }
    whereCondition.published_at = publishedAtCondition;
  }

  if (
    props.body.min_view_count !== undefined &&
    props.body.min_view_count !== null
  ) {
    whereCondition.view_count = { gte: props.body.min_view_count };
  }

  const sortBy = props.body.sort_by ?? "published_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const orderByClause: Record<string, string> = {
    [sortBy]: sortOrder,
  };

  const [articles, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_articles.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByClause,
      include: {
        category: true,
        author: true,
      },
    }),
    MyGlobal.prisma.discussion_board_articles.count({
      where: whereCondition,
    }),
  ]);

  const data: IDiscussionBoardArticle.ISummary[] = articles.map((article) => ({
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    status: article.status as "draft" | "published" | "archived",
    view_count: article.view_count,
    published_at: article.published_at
      ? toISOStringSafe(article.published_at)
      : null,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    is_edited: article.is_edited,
    discussion_board_article_category_id:
      article.discussion_board_article_category_id,
    discussion_board_member_id: article.discussion_board_member_id,
    deleted_at: article.deleted_at ? toISOStringSafe(article.deleted_at) : null,
    category: {
      id: article.category.id,
      name: article.category.name,
      slug: article.category.slug,
      description: article.category.description,
      sort_order: article.category.sort_order,
      created_at: toISOStringSafe(article.category.created_at),
      updated_at: toISOStringSafe(article.category.updated_at),
    },
    author: {
      id: article.author.id,
      username: article.author.username,
      display_name: article.author.display_name,
    },
  }));

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: totalPages,
    },
  };
}
