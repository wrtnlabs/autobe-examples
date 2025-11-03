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

export async function patchDiscussionBoardArticles(props: {
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const { body } = props;

  const DEFAULT_PAGE = 1;
  const DEFAULT_LIMIT = 20;
  const MAX_LIMIT = 100;

  const page = Number(body.page ?? DEFAULT_PAGE);
  const limit = Number(body.limit ?? DEFAULT_LIMIT);

  if (page < 1) throw new HttpException("Bad Request: page must be >= 1", 400);
  if (limit < 1)
    throw new HttpException("Bad Request: limit must be >= 1", 400);
  if (limit > MAX_LIMIT)
    throw new HttpException("Bad Request: limit exceeds maximum allowed", 400);

  const orderByRaw =
    body.sort === "createdAt"
      ? { created_at: "asc" }
      : body.sort === "-createdAt"
        ? { created_at: "desc" }
        : body.sort === "publishedAt"
          ? { published_at: "asc" }
          : body.sort === "-publishedAt"
            ? { published_at: "desc" }
            : { published_at: "desc" };

  // Cast the prepared object to the Prisma order-by input type to satisfy TS.
  // This is a simple type cast and does not perform runtime validation.
  const orderBy =
    orderByRaw as Prisma.discussion_board_articlesOrderByWithRelationInput;

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.discussion_board_articles.findMany({
        where: {
          deleted_at: null,
          state: "published",
          ...(body.author_id !== undefined &&
            body.author_id !== null && {
              discussion_board_member_id: body.author_id,
            }),
          ...(body.category_id !== undefined &&
            body.category_id !== null && {
              discussion_board_category_id: body.category_id,
            }),
          ...(body.tag_slugs !== undefined &&
            body.tag_slugs !== null && {
              discussion_board_article_tags: {
                some: {
                  tag: { slug: { in: body.tag_slugs } },
                },
              },
            }),
          ...(body.is_pinned !== undefined && { is_pinned: body.is_pinned }),
          ...(body.search !== undefined &&
            body.search !== null && {
              OR: [
                { title: { contains: body.search } },
                { content: { contains: body.search } },
              ],
            }),
          ...((body.createdFrom !== undefined && body.createdFrom !== null) ||
          (body.createdTo !== undefined && body.createdTo !== null)
            ? {
                created_at: {
                  ...(body.createdFrom !== undefined &&
                    body.createdFrom !== null && {
                      gte: body.createdFrom,
                    }),
                  ...(body.createdTo !== undefined &&
                    body.createdTo !== null && {
                      lte: body.createdTo,
                    }),
                },
              }
            : {}),
          ...((body.publishedFrom !== undefined &&
            body.publishedFrom !== null) ||
          (body.publishedTo !== undefined && body.publishedTo !== null)
            ? {
                published_at: {
                  ...(body.publishedFrom !== undefined &&
                    body.publishedFrom !== null && {
                      gte: body.publishedFrom,
                    }),
                  ...(body.publishedTo !== undefined &&
                    body.publishedTo !== null && {
                      lte: body.publishedTo,
                    }),
                },
              }
            : {}),
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              display_name: true,
              created_at: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              is_active: true,
              sort_order: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      }),

      MyGlobal.prisma.discussion_board_articles.count({
        where: {
          deleted_at: null,
          state: "published",
          ...(body.author_id !== undefined &&
            body.author_id !== null && {
              discussion_board_member_id: body.author_id,
            }),
          ...(body.category_id !== undefined &&
            body.category_id !== null && {
              discussion_board_category_id: body.category_id,
            }),
          ...(body.tag_slugs !== undefined &&
            body.tag_slugs !== null && {
              discussion_board_article_tags: {
                some: {
                  tag: { slug: { in: body.tag_slugs } },
                },
              },
            }),
          ...(body.is_pinned !== undefined && { is_pinned: body.is_pinned }),
          ...(body.search !== undefined &&
            body.search !== null && {
              OR: [
                { title: { contains: body.search } },
                { content: { contains: body.search } },
              ],
            }),
          ...((body.createdFrom !== undefined && body.createdFrom !== null) ||
          (body.createdTo !== undefined && body.createdTo !== null)
            ? {
                created_at: {
                  ...(body.createdFrom !== undefined &&
                    body.createdFrom !== null && {
                      gte: body.createdFrom,
                    }),
                  ...(body.createdTo !== undefined &&
                    body.createdTo !== null && {
                      lte: body.createdTo,
                    }),
                },
              }
            : {}),
          ...((body.publishedFrom !== undefined &&
            body.publishedFrom !== null) ||
          (body.publishedTo !== undefined && body.publishedTo !== null)
            ? {
                published_at: {
                  ...(body.publishedFrom !== undefined &&
                    body.publishedFrom !== null && {
                      gte: body.publishedFrom,
                    }),
                  ...(body.publishedTo !== undefined &&
                    body.publishedTo !== null && {
                      lte: body.publishedTo,
                    }),
                },
              }
            : {}),
        },
      }),
    ]);

    // Treat rows as any[] to safely access included relations without complex Prisma type issues
    const data = (rows as any[]).map((r: any) => {
      const excerpt = r.content ? r.content.slice(0, 200) : undefined;

      return {
        id: r.id,
        title: r.title,
        excerpt: excerpt ?? undefined,
        author: r.author
          ? {
              id: r.author.id,
              username: r.author.username,
              display_name: r.author.display_name ?? null,
              created_at: toISOStringSafe(r.author.created_at),
            }
          : null,
        isPinned: r.is_pinned,
        publishedAt: r.published_at ? toISOStringSafe(r.published_at) : null,
        createdAt: toISOStringSafe(r.created_at),
        updatedAt: r.updated_at ? toISOStringSafe(r.updated_at) : null,
        category: r.category
          ? {
              id: r.category.id,
              name: r.category.name,
              slug: r.category.slug,
              description: r.category.description ?? null,
              is_active: r.category.is_active,
              sort_order: r.category.sort_order ?? null,
              created_at: toISOStringSafe(r.category.created_at),
              updated_at: r.category.updated_at
                ? toISOStringSafe(r.category.updated_at)
                : null,
              deleted_at: r.category.deleted_at
                ? toISOStringSafe(r.category.deleted_at)
                : null,
            }
          : null,
      };
    });

    const pages = limit > 0 ? Math.ceil(total / limit) : 0;

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: total,
        pages: Number(pages),
      },
      data,
    };
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }
}
