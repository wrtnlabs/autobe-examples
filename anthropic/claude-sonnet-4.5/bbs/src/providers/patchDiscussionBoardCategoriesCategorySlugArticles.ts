import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function patchDiscussionBoardCategoriesCategorySlugArticles(props: {
  categorySlug: string;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const { categorySlug, body } = props;

  const category = await MyGlobal.prisma.discussion_board_categories.findFirst({
    where: { slug: categorySlug },
  });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  let authorId: string | undefined = undefined;
  if (body.author_username !== undefined && body.author_username !== null) {
    const author = await MyGlobal.prisma.discussion_board_members.findFirst({
      where: { username: body.author_username },
    });
    if (author) {
      authorId = author.id;
    }
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const [articles, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_articles.findMany({
      where: {
        deleted_at: null,
        discussion_board_article_categories: {
          some: {
            discussion_board_category_id: category.id,
          },
        },
        ...(body.search !== undefined &&
          body.search !== null && {
            OR: [
              { title: { contains: body.search } },
              { body: { contains: body.search } },
            ],
          }),
        ...(body.status !== undefined &&
          body.status !== null && {
            status: body.status,
          }),
        ...(authorId !== undefined && {
          discussion_board_member_id: authorId,
        }),
        ...(((body.created_after !== undefined &&
          body.created_after !== null) ||
          (body.created_before !== undefined &&
            body.created_before !== null)) && {
          created_at: {
            ...(body.created_after !== undefined &&
              body.created_after !== null && {
                gte: body.created_after,
              }),
            ...(body.created_before !== undefined &&
              body.created_before !== null && {
                lte: body.created_before,
              }),
          },
        }),
        ...(((body.min_view_count !== undefined &&
          body.min_view_count !== null) ||
          (body.max_view_count !== undefined &&
            body.max_view_count !== null)) && {
          view_count: {
            ...(body.min_view_count !== undefined &&
              body.min_view_count !== null && {
                gte: body.min_view_count,
              }),
            ...(body.max_view_count !== undefined &&
              body.max_view_count !== null && {
                lte: body.max_view_count,
              }),
          },
        }),
        ...(((body.min_comment_count !== undefined &&
          body.min_comment_count !== null) ||
          (body.max_comment_count !== undefined &&
            body.max_comment_count !== null)) && {
          comment_count: {
            ...(body.min_comment_count !== undefined &&
              body.min_comment_count !== null && {
                gte: body.min_comment_count,
              }),
            ...(body.max_comment_count !== undefined &&
              body.max_comment_count !== null && {
                lte: body.max_comment_count,
              }),
          },
        }),
      },
      orderBy:
        body.sort_by === "updated_at"
          ? { updated_at: body.sort_order === "asc" ? "asc" : "desc" }
          : body.sort_by === "view_count"
            ? { view_count: body.sort_order === "asc" ? "asc" : "desc" }
            : body.sort_by === "comment_count"
              ? { comment_count: body.sort_order === "asc" ? "asc" : "desc" }
              : { created_at: body.sort_order === "asc" ? "asc" : "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_articles.count({
      where: {
        deleted_at: null,
        discussion_board_article_categories: {
          some: {
            discussion_board_category_id: category.id,
          },
        },
        ...(body.search !== undefined &&
          body.search !== null && {
            OR: [
              { title: { contains: body.search } },
              { body: { contains: body.search } },
            ],
          }),
        ...(body.status !== undefined &&
          body.status !== null && {
            status: body.status,
          }),
        ...(authorId !== undefined && {
          discussion_board_member_id: authorId,
        }),
        ...(((body.created_after !== undefined &&
          body.created_after !== null) ||
          (body.created_before !== undefined &&
            body.created_before !== null)) && {
          created_at: {
            ...(body.created_after !== undefined &&
              body.created_after !== null && {
                gte: body.created_after,
              }),
            ...(body.created_before !== undefined &&
              body.created_before !== null && {
                lte: body.created_before,
              }),
          },
        }),
        ...(((body.min_view_count !== undefined &&
          body.min_view_count !== null) ||
          (body.max_view_count !== undefined &&
            body.max_view_count !== null)) && {
          view_count: {
            ...(body.min_view_count !== undefined &&
              body.min_view_count !== null && {
                gte: body.min_view_count,
              }),
            ...(body.max_view_count !== undefined &&
              body.max_view_count !== null && {
                lte: body.max_view_count,
              }),
          },
        }),
        ...(((body.min_comment_count !== undefined &&
          body.min_comment_count !== null) ||
          (body.max_comment_count !== undefined &&
            body.max_comment_count !== null)) && {
          comment_count: {
            ...(body.min_comment_count !== undefined &&
              body.min_comment_count !== null && {
                gte: body.min_comment_count,
              }),
            ...(body.max_comment_count !== undefined &&
              body.max_comment_count !== null && {
                lte: body.max_comment_count,
              }),
          },
        }),
      },
    }),
  ]);

  const articleIds = articles.map((a) => a.id);
  const memberIds = [
    ...new Set(articles.map((a) => a.discussion_board_member_id)),
  ];

  const [authors, articleCategories, articleTags] = await Promise.all([
    MyGlobal.prisma.discussion_board_members.findMany({
      where: { id: { in: memberIds } },
    }),
    MyGlobal.prisma.discussion_board_article_categories.findMany({
      where: { discussion_board_article_id: { in: articleIds } },
      include: { category: true },
    }),
    MyGlobal.prisma.discussion_board_article_tags.findMany({
      where: { discussion_board_article_id: { in: articleIds } },
      include: { tag: true },
    }),
  ]);

  const data: IDiscussionBoardArticle.ISummary[] = articles.map((article) => {
    const author = authors.find(
      (a) => a.id === article.discussion_board_member_id,
    );

    if (!author) {
      throw new HttpException("Article author not found", 500);
    }

    const categories = articleCategories
      .filter((ac) => ac.discussion_board_article_id === article.id)
      .map((ac) => ({
        id: ac.category.id,
        name: ac.category.name,
        slug: ac.category.slug,
        description: ac.category.description ?? null,
        created_at: toISOStringSafe(ac.category.created_at),
        updated_at: toISOStringSafe(ac.category.updated_at),
      }));

    const tags = articleTags
      .filter((at) => at.discussion_board_article_id === article.id)
      .map((at) => ({
        id: at.tag.id,
        name: at.tag.name,
        slug: at.tag.slug,
        created_at: toISOStringSafe(at.tag.created_at),
        updated_at: toISOStringSafe(at.tag.updated_at),
      }));

    return {
      id: article.id,
      title: article.title,
      summary: article.summary ?? null,
      status: article.status,
      view_count: article.view_count,
      comment_count: article.comment_count,
      author: {
        id: author.id,
        username: author.username,
        display_name: author.display_name ?? null,
        profile_picture_url: author.profile_picture_url ?? null,
      },
      categories: categories,
      tags: tags,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
      deleted_at: article.deleted_at
        ? toISOStringSafe(article.deleted_at)
        : null,
    };
  });

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data: data,
  };
}
