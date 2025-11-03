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

export async function patchDiscussionBoardMembersMemberUsernameArticles(props: {
  memberUsername: string;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const { memberUsername, body } = props;

  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: { username: memberUsername },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const allowedSortFields = [
    "created_at",
    "updated_at",
    "view_count",
    "comment_count",
  ];
  const sortBy =
    body.sort_by !== undefined && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  const [articles, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_articles.findMany({
      where: {
        discussion_board_member_id: member.id,
        deleted_at: null,
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
        ...((body.created_after !== undefined && body.created_after !== null) ||
        (body.created_before !== undefined && body.created_before !== null)
          ? {
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
            }
          : {}),
        ...((body.min_view_count !== undefined &&
          body.min_view_count !== null) ||
        (body.max_view_count !== undefined && body.max_view_count !== null)
          ? {
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
            }
          : {}),
        ...((body.min_comment_count !== undefined &&
          body.min_comment_count !== null) ||
        (body.max_comment_count !== undefined &&
          body.max_comment_count !== null)
          ? {
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
            }
          : {}),
        ...(body.category_slugs !== undefined &&
          body.category_slugs !== null &&
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
          body.tag_slugs !== null &&
          body.tag_slugs.length > 0 && {
            discussion_board_article_tags: {
              some: {
                tag: {
                  slug: { in: body.tag_slugs },
                },
              },
            },
          }),
        ...(body.has_images === true && {
          discussion_board_article_images: {
            some: {
              deleted_at: null,
            },
          },
        }),
        ...(body.has_documents === true && {
          discussion_board_article_documents: {
            some: {
              deleted_at: null,
            },
          },
        }),
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
        discussion_board_member_id: member.id,
        deleted_at: null,
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
        ...((body.created_after !== undefined && body.created_after !== null) ||
        (body.created_before !== undefined && body.created_before !== null)
          ? {
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
            }
          : {}),
        ...((body.min_view_count !== undefined &&
          body.min_view_count !== null) ||
        (body.max_view_count !== undefined && body.max_view_count !== null)
          ? {
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
            }
          : {}),
        ...((body.min_comment_count !== undefined &&
          body.min_comment_count !== null) ||
        (body.max_comment_count !== undefined &&
          body.max_comment_count !== null)
          ? {
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
            }
          : {}),
        ...(body.category_slugs !== undefined &&
          body.category_slugs !== null &&
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
          body.tag_slugs !== null &&
          body.tag_slugs.length > 0 && {
            discussion_board_article_tags: {
              some: {
                tag: {
                  slug: { in: body.tag_slugs },
                },
              },
            },
          }),
        ...(body.has_images === true && {
          discussion_board_article_images: {
            some: {
              deleted_at: null,
            },
          },
        }),
        ...(body.has_documents === true && {
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
    summary: article.summary ?? null,
    status: article.status,
    view_count: article.view_count,
    comment_count: article.comment_count,
    author: {
      id: article.author.id,
      username: article.author.username,
      display_name: article.author.display_name ?? null,
      profile_picture_url: article.author.profile_picture_url ?? null,
    },
    categories: article.discussion_board_article_categories.map((ac) => ({
      id: ac.category.id,
      name: ac.category.name,
      slug: ac.category.slug,
      description: ac.category.description ?? null,
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
    data,
  };
}
