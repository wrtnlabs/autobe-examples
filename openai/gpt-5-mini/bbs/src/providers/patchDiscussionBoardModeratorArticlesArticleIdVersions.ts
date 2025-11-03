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

export async function patchDiscussionBoardModeratorArticlesArticleIdVersions(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardArticleSnapshot.ISummary> {
  const { moderator, articleId, body } = props;

  // Use moderator payload for authorization contract: verify moderator exists and not deleted
  const moderatorRecord =
    await MyGlobal.prisma.discussion_board_moderator.findUnique({
      where: { id: moderator.id },
      select: { id: true, deleted_at: true },
    });
  if (!moderatorRecord || moderatorRecord.deleted_at !== null) {
    throw new HttpException("Unauthorized: moderator not active", 403);
  }

  // Verify article existence
  const articleExists =
    await MyGlobal.prisma.discussion_board_articles.findUnique({
      where: { id: articleId },
      select: { id: true },
    });
  if (!articleExists) throw new HttpException("Not Found", 404);

  // Normalize pagination parameters
  const page = Number(body.page ?? 1);
  const limit = Math.min(Number(body.limit ?? 20), 100);
  const skip = (page - 1) * limit;

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.discussion_board_article_snapshots.findMany({
        where: {
          discussion_board_article_id: articleId,
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
        },
        include: {
          article: {
            select: {
              id: true,
              title: true,
              is_pinned: true,
              published_at: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
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
          },
        },
        orderBy:
          body.sort === "snapshot_at"
            ? { snapshot_at: "asc" }
            : body.sort === "-snapshot_at"
              ? { snapshot_at: "desc" }
              : { snapshot_at: "desc" },
        skip,
        take: limit,
      }),
      MyGlobal.prisma.discussion_board_article_snapshots.count({
        where: {
          discussion_board_article_id: articleId,
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
        },
      }),
    ]);

    const data: IDiscussionBoardArticleSnapshot.ISummary[] = rows.map((r) => {
      const article = r.article;

      const articleAuthor = article.author
        ? {
            id: article.author.id,
            username: article.author.username,
            display_name: article.author.display_name ?? null,
            created_at: toISOStringSafe(article.author.created_at),
          }
        : null;

      const articleCategory = article.category
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
              : null,
            deleted_at: article.category.deleted_at
              ? toISOStringSafe(article.category.deleted_at)
              : null,
          }
        : null;

      const articleSummary: IDiscussionBoardArticle.ISummary = {
        id: article.id,
        title: article.title,
        excerpt: undefined,
        author: articleAuthor,
        isPinned: article.is_pinned ?? undefined,
        publishedAt: article.published_at
          ? toISOStringSafe(article.published_at)
          : null,
        createdAt: toISOStringSafe(article.created_at),
        updatedAt: article.updated_at
          ? toISOStringSafe(article.updated_at)
          : null,
        category: articleCategory,
      };

      const contentExcerpt = r.content
        ? r.content.length > 200
          ? r.content.slice(0, 200)
          : r.content
        : null;

      const summary: IDiscussionBoardArticleSnapshot.ISummary = {
        id: r.id,
        article: articleSummary,
        title: r.title,
        snapshot_at: toISOStringSafe(r.snapshot_at),
        created_at: toISOStringSafe(r.created_at),
        state: typia.assert<
          "draft" | "published" | "pending_review" | "hidden"
        >(r.state),
        content_excerpt: contentExcerpt,
        updated_at: r.updated_at ? toISOStringSafe(r.updated_at) : null,
        deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
      };

      return summary;
    });

    const result: IPageIDiscussionBoardArticleSnapshot.ISummary = {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: total,
        pages: Math.ceil(total / limit),
      },
      data,
    };

    return result;
  } catch (e) {
    if (e instanceof HttpException) throw e;
    throw new HttpException("Internal Server Error", 500);
  }
}
