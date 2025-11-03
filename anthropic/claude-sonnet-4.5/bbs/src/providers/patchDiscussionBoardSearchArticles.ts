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

export async function patchDiscussionBoardSearchArticles(props: {
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_articles.findMany({
      where: {
        deleted_at: null,
        ...(body.status !== undefined && { status: body.status }),
        ...(body.search !== undefined && {
          OR: [
            { title: { contains: body.search } },
            { body: { contains: body.search } },
          ],
        }),
        ...(body.category_slugs !== undefined &&
          body.category_slugs.length > 0 && {
            discussion_board_article_categories: {
              some: {
                category: {
                  slug: { in: body.category_slugs },
                },
              },
            },
          }),
        ...(body.tag_slugs !== undefined &&
          body.tag_slugs.length > 0 && {
            AND: body.tag_slugs.map((tagSlug) => ({
              discussion_board_article_tags: {
                some: {
                  tag: {
                    slug: tagSlug,
                  },
                },
              },
            })),
          }),
        ...(body.author_username !== undefined && {
          author: {
            username: body.author_username,
          },
        }),
        ...((body.created_after !== undefined ||
          body.created_before !== undefined) && {
          created_at: {
            ...(body.created_after !== undefined && {
              gte: body.created_after,
            }),
            ...(body.created_before !== undefined && {
              lte: body.created_before,
            }),
          },
        }),
        ...((body.min_view_count !== undefined ||
          body.max_view_count !== undefined) && {
          view_count: {
            ...(body.min_view_count !== undefined && {
              gte: body.min_view_count,
            }),
            ...(body.max_view_count !== undefined && {
              lte: body.max_view_count,
            }),
          },
        }),
        ...((body.min_comment_count !== undefined ||
          body.max_comment_count !== undefined) && {
          comment_count: {
            ...(body.min_comment_count !== undefined && {
              gte: body.min_comment_count,
            }),
            ...(body.max_comment_count !== undefined && {
              lte: body.max_comment_count,
            }),
          },
        }),
        ...(body.has_images === true && {
          discussion_board_article_images: {
            some: { deleted_at: null },
          },
        }),
        ...(body.has_documents === true && {
          discussion_board_article_documents: {
            some: { deleted_at: null },
          },
        }),
      },
      orderBy:
        body.sort_by === "view_count"
          ? { view_count: body.sort_order === "asc" ? "asc" : "desc" }
          : body.sort_by === "comment_count"
            ? { comment_count: body.sort_order === "asc" ? "asc" : "desc" }
            : body.sort_by === "updated_at"
              ? { updated_at: body.sort_order === "asc" ? "asc" : "desc" }
              : body.sort_by === "relevance"
                ? { created_at: "desc" }
                : { created_at: body.sort_order === "asc" ? "asc" : "desc" },
      skip,
      take: limit,
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
    }),
    MyGlobal.prisma.discussion_board_articles.count({
      where: {
        deleted_at: null,
        ...(body.status !== undefined && { status: body.status }),
        ...(body.search !== undefined && {
          OR: [
            { title: { contains: body.search } },
            { body: { contains: body.search } },
          ],
        }),
        ...(body.category_slugs !== undefined &&
          body.category_slugs.length > 0 && {
            discussion_board_article_categories: {
              some: {
                category: {
                  slug: { in: body.category_slugs },
                },
              },
            },
          }),
        ...(body.tag_slugs !== undefined &&
          body.tag_slugs.length > 0 && {
            AND: body.tag_slugs.map((tagSlug) => ({
              discussion_board_article_tags: {
                some: {
                  tag: {
                    slug: tagSlug,
                  },
                },
              },
            })),
          }),
        ...(body.author_username !== undefined && {
          author: {
            username: body.author_username,
          },
        }),
        ...((body.created_after !== undefined ||
          body.created_before !== undefined) && {
          created_at: {
            ...(body.created_after !== undefined && {
              gte: body.created_after,
            }),
            ...(body.created_before !== undefined && {
              lte: body.created_before,
            }),
          },
        }),
        ...((body.min_view_count !== undefined ||
          body.max_view_count !== undefined) && {
          view_count: {
            ...(body.min_view_count !== undefined && {
              gte: body.min_view_count,
            }),
            ...(body.max_view_count !== undefined && {
              lte: body.max_view_count,
            }),
          },
        }),
        ...((body.min_comment_count !== undefined ||
          body.max_comment_count !== undefined) && {
          comment_count: {
            ...(body.min_comment_count !== undefined && {
              gte: body.min_comment_count,
            }),
            ...(body.max_comment_count !== undefined && {
              lte: body.max_comment_count,
            }),
          },
        }),
        ...(body.has_images === true && {
          discussion_board_article_images: {
            some: { deleted_at: null },
          },
        }),
        ...(body.has_documents === true && {
          discussion_board_article_documents: {
            some: { deleted_at: null },
          },
        }),
      },
    }),
  ]);

  const articles = data.map((article) => ({
    id: article.id,
    title: article.title,
    summary: article.summary,
    status: article.status,
    view_count: article.view_count,
    comment_count: article.comment_count,
    author: {
      id: article.author.id,
      username: article.author.username,
      display_name: article.author.display_name,
      profile_picture_url: article.author.profile_picture_url,
    },
    categories: article.discussion_board_article_categories.map((ac) => ({
      id: ac.category.id,
      name: ac.category.name,
      slug: ac.category.slug,
      description: ac.category.description,
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

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: articles,
  };
}
