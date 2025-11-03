import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import { IPageIDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorArticlesVersions(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardArticleSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardArticleSnapshot.ISummary> {
  const { moderator, body } = props;

  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.discussion_board_article_snapshots.findMany({
        where: {
          ...(body.article_id !== undefined &&
            body.article_id !== null && {
              discussion_board_article_id: body.article_id,
            }),
          ...(body.state !== undefined &&
            body.state !== null && { state: body.state }),
          ...((body.snapshot_from !== undefined &&
            body.snapshot_from !== null) ||
          (body.snapshot_to !== undefined && body.snapshot_to !== null)
            ? {
                snapshot_at: {
                  ...(body.snapshot_from !== undefined &&
                    body.snapshot_from !== null && {
                      gte: toISOStringSafe(body.snapshot_from),
                    }),
                  ...(body.snapshot_to !== undefined &&
                    body.snapshot_to !== null && {
                      lte: toISOStringSafe(body.snapshot_to),
                    }),
                },
              }
            : {}),
          ...(body.search !== undefined &&
            body.search !== null && {
              OR: [
                { title: { contains: body.search } },
                { content: { contains: body.search } },
              ],
            }),
          ...(body.author_username !== undefined &&
            body.author_username !== null && {
              article: {
                author: {
                  username: body.author_username,
                },
              },
            }),
        },
        include: {
          article: {
            include: {
              author: true,
              category: true,
            },
          },
        },
        orderBy:
          body.sort === "snapshot_at"
            ? { snapshot_at: "asc" }
            : body.sort === "-snapshot_at"
              ? { snapshot_at: "desc" }
              : body.sort === "created_at"
                ? { created_at: "asc" }
                : body.sort === "-created_at"
                  ? { created_at: "desc" }
                  : { snapshot_at: "desc" },
        skip,
        take: limit,
      }),

      MyGlobal.prisma.discussion_board_article_snapshots.count({
        where: {
          ...(body.article_id !== undefined &&
            body.article_id !== null && {
              discussion_board_article_id: body.article_id,
            }),
          ...(body.state !== undefined &&
            body.state !== null && { state: body.state }),
          ...((body.snapshot_from !== undefined &&
            body.snapshot_from !== null) ||
          (body.snapshot_to !== undefined && body.snapshot_to !== null)
            ? {
                snapshot_at: {
                  ...(body.snapshot_from !== undefined &&
                    body.snapshot_from !== null && {
                      gte: toISOStringSafe(body.snapshot_from),
                    }),
                  ...(body.snapshot_to !== undefined &&
                    body.snapshot_to !== null && {
                      lte: toISOStringSafe(body.snapshot_to),
                    }),
                },
              }
            : {}),
          ...(body.search !== undefined &&
            body.search !== null && {
              OR: [
                { title: { contains: body.search } },
                { content: { contains: body.search } },
              ],
            }),
          ...(body.author_username !== undefined &&
            body.author_username !== null && {
              article: {
                author: {
                  username: body.author_username,
                },
              },
            }),
        },
      }),
    ] as const);

    const data = rows.map((r) => {
      const article = r.article;

      const articleSummary = {
        id: article.id,
        title: article.title,
        excerpt: undefined,
        author: article.author
          ? {
              id: article.author.id,
              username: article.author.username,
              display_name: article.author.display_name ?? null,
              created_at: toISOStringSafe(article.author.created_at),
            }
          : null,
        isPinned: article.is_pinned ?? undefined,
        publishedAt: article.published_at
          ? toISOStringSafe(article.published_at)
          : null,
        createdAt: toISOStringSafe(article.created_at),
        updatedAt: article.updated_at
          ? toISOStringSafe(article.updated_at)
          : undefined,
        category: article.category
          ? {
              id: article.category.id,
              name: article.category.name,
              slug: article.category.slug,
              description: article.category.description ?? null,
              is_active: article.category.is_active,
              sort_order: article.category.sort_order ?? null,
              created_at: toISOStringSafe(article.category.created_at),
              updated_at: article.category.updated_at
                ? toISOStringSafe(article.category.updated_at)
                : undefined,
              deleted_at: article.category.deleted_at
                ? toISOStringSafe(article.category.deleted_at)
                : null,
            }
          : null,
      } satisfies IDiscussionBoardArticle.ISummary;

      const summary = {
        id: r.id,
        article: articleSummary,
        title: r.title,
        snapshot_at: toISOStringSafe(r.snapshot_at),
        created_at: toISOStringSafe(r.created_at),
        state: typia.assert<
          "draft" | "published" | "pending_review" | "hidden"
        >(r.state as unknown),
        content_excerpt: r.content
          ? r.content.length > 200
            ? r.content.slice(0, 200)
            : r.content
          : undefined,
        updated_at: r.updated_at ? toISOStringSafe(r.updated_at) : undefined,
        deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
      } satisfies IDiscussionBoardArticleSnapshot.ISummary;

      return summary;
    });

    return {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
      data,
    } satisfies IPageIDiscussionBoardArticleSnapshot.ISummary;
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }
}
