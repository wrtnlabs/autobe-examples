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

export async function patchDiscussionBoardTagsTagSlugArticles(props: {
  tagSlug: string;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const { tagSlug, body } = props;

  const tag = await MyGlobal.prisma.discussion_board_tags.findUnique({
    where: { slug: tagSlug },
  });

  if (!tag) {
    throw new HttpException("Tag not found", 404);
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const sortBy = body.sort_by ?? "created_at";
  const sortOrder = body.sort_order ?? "desc";

  const tagFilters = [tag.id];
  if (body.tag_slugs && body.tag_slugs.length > 0) {
    const additionalTags = await MyGlobal.prisma.discussion_board_tags.findMany(
      {
        where: { slug: { in: body.tag_slugs } },
        select: { id: true },
      },
    );
    tagFilters.push(...additionalTags.map((t) => t.id));
  }

  const createdAtCondition = {
    ...(body.created_after !== undefined &&
      body.created_after !== null && {
        gte: body.created_after,
      }),
    ...(body.created_before !== undefined &&
      body.created_before !== null && {
        lte: body.created_before,
      }),
  };

  const viewCountCondition = {
    ...(body.min_view_count !== undefined &&
      body.min_view_count !== null && {
        gte: body.min_view_count,
      }),
    ...(body.max_view_count !== undefined &&
      body.max_view_count !== null && {
        lte: body.max_view_count,
      }),
  };

  const commentCountCondition = {
    ...(body.min_comment_count !== undefined &&
      body.min_comment_count !== null && {
        gte: body.min_comment_count,
      }),
    ...(body.max_comment_count !== undefined &&
      body.max_comment_count !== null && {
        lte: body.max_comment_count,
      }),
  };

  const [articles, totalCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_articles.findMany({
      where: {
        deleted_at: null,
        discussion_board_article_tags: {
          some: {
            discussion_board_tag_id: { in: tagFilters },
          },
        },
        ...(body.search && {
          OR: [
            { title: { contains: body.search } },
            { body: { contains: body.search } },
          ],
        }),
        ...(body.category_slugs &&
          body.category_slugs.length > 0 && {
            discussion_board_article_categories: {
              some: {
                category: {
                  slug: { in: body.category_slugs },
                },
              },
            },
          }),
        ...(body.author_username && {
          author: {
            username: body.author_username,
          },
        }),
        ...(body.status && {
          status: body.status,
        }),
        ...(Object.keys(createdAtCondition).length > 0 && {
          created_at: createdAtCondition,
        }),
        ...(Object.keys(viewCountCondition).length > 0 && {
          view_count: viewCountCondition,
        }),
        ...(Object.keys(commentCountCondition).length > 0 && {
          comment_count: commentCountCondition,
        }),
        ...(body.has_images && {
          discussion_board_article_images: {
            some: {
              deleted_at: null,
            },
          },
        }),
        ...(body.has_documents && {
          discussion_board_article_documents: {
            some: {
              deleted_at: null,
            },
          },
        }),
      },
      include: {
        author: true,
        discussion_board_article_categories: {
          include: {
            category: true,
          },
        },
        discussion_board_article_tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy:
        sortBy === "created_at"
          ? { created_at: sortOrder }
          : sortBy === "updated_at"
            ? { updated_at: sortOrder }
            : sortBy === "view_count"
              ? { view_count: sortOrder }
              : sortBy === "comment_count"
                ? { comment_count: sortOrder }
                : { created_at: sortOrder },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_articles.count({
      where: {
        deleted_at: null,
        discussion_board_article_tags: {
          some: {
            discussion_board_tag_id: { in: tagFilters },
          },
        },
        ...(body.search && {
          OR: [
            { title: { contains: body.search } },
            { body: { contains: body.search } },
          ],
        }),
        ...(body.category_slugs &&
          body.category_slugs.length > 0 && {
            discussion_board_article_categories: {
              some: {
                category: {
                  slug: { in: body.category_slugs },
                },
              },
            },
          }),
        ...(body.author_username && {
          author: {
            username: body.author_username,
          },
        }),
        ...(body.status && {
          status: body.status,
        }),
        ...(Object.keys(createdAtCondition).length > 0 && {
          created_at: createdAtCondition,
        }),
        ...(Object.keys(viewCountCondition).length > 0 && {
          view_count: viewCountCondition,
        }),
        ...(Object.keys(commentCountCondition).length > 0 && {
          comment_count: commentCountCondition,
        }),
        ...(body.has_images && {
          discussion_board_article_images: {
            some: {
              deleted_at: null,
            },
          },
        }),
        ...(body.has_documents && {
          discussion_board_article_documents: {
            some: {
              deleted_at: null,
            },
          },
        }),
      },
    }),
  ]);

  const data = articles.map((article) => ({
    id: article.id,
    title: article.title,
    summary: article.summary,
    status: article.status,
    view_count: article.view_count,
    comment_count: article.comment_count,
    author: {
      id: article.author.id,
      username: article.author.username,
      display_name: article.author.display_name ?? undefined,
      profile_picture_url: article.author.profile_picture_url ?? undefined,
    },
    categories: article.discussion_board_article_categories.map((ac) => ({
      id: ac.category.id,
      name: ac.category.name,
      slug: ac.category.slug,
      description: ac.category.description ?? undefined,
      created_at: toISOStringSafe(ac.category.created_at),
      updated_at: toISOStringSafe(ac.category.updated_at),
    })),
    tags: article.discussion_board_article_tags.map((at) => ({
      id: at.tag.id,
      name: at.tag.name,
      slug: at.tag.slug,
      created_at: toISOStringSafe(at.tag.created_at),
      updated_at: toISOStringSafe(at.tag.updated_at),
    })),
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    deleted_at: article.deleted_at ? toISOStringSafe(article.deleted_at) : null,
  }));

  const totalPages = Math.ceil(totalCount / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: totalCount,
      pages: totalPages,
    },
    data: data,
  };
}
