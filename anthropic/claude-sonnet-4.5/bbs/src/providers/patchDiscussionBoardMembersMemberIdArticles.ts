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

export async function patchDiscussionBoardMembersMemberIdArticles(props: {
  memberId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sortOrder = props.body.sort_order ?? "desc";
  const sortBy = props.body.sort_by ?? "published_at";

  const [articles, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_articles.findMany({
      where: {
        discussion_board_member_id: props.memberId,
        status: "published",
        deleted_at: null,
        ...(props.body.search && {
          OR: [
            { title: { contains: props.body.search } },
            { body: { contains: props.body.search } },
          ],
        }),
        ...(props.body.discussion_board_article_category_id && {
          discussion_board_article_category_id:
            props.body.discussion_board_article_category_id,
        }),
        ...(props.body.published_after || props.body.published_before
          ? {
              published_at: {
                ...(props.body.published_after && {
                  gte: new Date(props.body.published_after),
                }),
                ...(props.body.published_before && {
                  lte: new Date(props.body.published_before),
                }),
              },
            }
          : {}),
        ...(props.body.min_view_count !== undefined && {
          view_count: { gte: props.body.min_view_count },
        }),
      },
      skip,
      take: limit,
      orderBy:
        sortBy === "published_at"
          ? { published_at: sortOrder }
          : sortBy === "created_at"
            ? { created_at: sortOrder }
            : sortBy === "updated_at"
              ? { updated_at: sortOrder }
              : { view_count: sortOrder },
      include: {
        category: true,
        author: true,
      },
    }),
    MyGlobal.prisma.discussion_board_articles.count({
      where: {
        discussion_board_member_id: props.memberId,
        status: "published",
        deleted_at: null,
        ...(props.body.search && {
          OR: [
            { title: { contains: props.body.search } },
            { body: { contains: props.body.search } },
          ],
        }),
        ...(props.body.discussion_board_article_category_id && {
          discussion_board_article_category_id:
            props.body.discussion_board_article_category_id,
        }),
        ...(props.body.published_after || props.body.published_before
          ? {
              published_at: {
                ...(props.body.published_after && {
                  gte: new Date(props.body.published_after),
                }),
                ...(props.body.published_before && {
                  lte: new Date(props.body.published_before),
                }),
              },
            }
          : {}),
        ...(props.body.min_view_count !== undefined && {
          view_count: { gte: props.body.min_view_count },
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
    data: articles.map((article) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt ?? undefined,
      status: article.status as "draft" | "published" | "archived",
      view_count: article.view_count,
      published_at: article.published_at
        ? toISOStringSafe(article.published_at)
        : undefined,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
      is_edited: article.is_edited,
      discussion_board_article_category_id:
        article.discussion_board_article_category_id,
      discussion_board_member_id: article.discussion_board_member_id,
      deleted_at: article.deleted_at
        ? toISOStringSafe(article.deleted_at)
        : undefined,
      category: {
        id: article.category.id,
        name: article.category.name,
        slug: article.category.slug,
        description: article.category.description ?? undefined,
        sort_order: article.category.sort_order,
        created_at: toISOStringSafe(article.category.created_at),
        updated_at: toISOStringSafe(article.category.updated_at),
      },
      author: {
        id: article.author.id,
        username: article.author.username,
        display_name: article.author.display_name ?? undefined,
      },
    })),
  };
}
