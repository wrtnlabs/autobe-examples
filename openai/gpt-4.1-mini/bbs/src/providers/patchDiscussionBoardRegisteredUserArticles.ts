import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardRegisteredUserArticles(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const { body } = props;
  const {
    page = 1,
    limit = 20,
    title,
    content,
    section_id,
    tag_ids,
    sort,
  } = body as Partial<{
    page: number;
    limit: number;
    title: string;
    content: string;
    section_id: string;
    tag_ids: string[];
    sort: "oldest" | "newest";
  }>;
  const pageNumber = typeof page === "number" && page > 0 ? page : 1;
  const limitNumber = typeof limit === "number" && limit > 0 ? limit : 20;
  const skipCount = (pageNumber - 1) * limitNumber;
  const whereFilter: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
  };
  const baseWhereFilter = whereFilter;
  const whereFinal: Prisma.discussion_board_articlesWhereInput = {
    ...baseWhereFilter,
    ...(typeof title === "string" && title.length > 0
      ? { title: { contains: title, mode: Prisma.QueryMode.insensitive } }
      : {}),
    ...(typeof content === "string" && content.length > 0
      ? { content: { contains: content, mode: Prisma.QueryMode.insensitive } }
      : {}),
    ...(typeof section_id === "string" && section_id ? { section_id } : {}),
    ...(Array.isArray(tag_ids) && tag_ids.length > 0
      ? {
          articleTags: {
            some: { discussion_board_tag_id: { in: tag_ids } },
          },
        }
      : {}),
  };
  const orderByInput: Prisma.discussion_board_articlesOrderByWithRelationInput =
    sort === "oldest"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const };
  const articles = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: whereFinal,
    orderBy: orderByInput,
    skip: skipCount,
    take: limitNumber,
    include: {
      author: { select: { display_name: true, id: true } },
      articleTags: { select: { tag: { select: { id: true, name: true } } } },
    },
  });
  const totalCount = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereFinal,
  });
  const articleIds = articles.map((article) => article.id);
  const commentCounts = await MyGlobal.prisma.discussion_board_comments.groupBy(
    {
      by: ["discussion_board_article_id"],
      where: {
        discussion_board_article_id: { in: articleIds },
        deleted_at: null,
      },
      _count: { discussion_board_article_id: true },
    },
  );
  const commentCountMap = new Map(
    commentCounts.map((cc) => [
      cc.discussion_board_article_id,
      cc._count.discussion_board_article_id,
    ]),
  );
  type ArticleType = (typeof articles)[number];
  function mapToSummary(
    article: ArticleType,
  ): IDiscussionBoardArticle.ISummary {
    return {
      id: article.id,
      title: article.title,
      author_display_name: article.author.display_name,
      tags: article.articleTags.map((t) => ({
        id: t.tag.id,
        name: t.tag.name,
      })),
      comment_count: commentCountMap.get(article.id) ?? 0,
      posted_at: toISOStringSafe(article.created_at),
    };
  }
  return {
    data: articles.map(mapToSummary),
    pagination: {
      current: pageNumber,
      limit: limitNumber,
      records: totalCount,
      pages: Math.ceil(totalCount / limitNumber),
    },
  };
}
