import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function getDiscussionBoardArticlesArticleId(props: {
  articleId: string & tags.Format<"uuid">;
  includeComments: string;
  commentsPage: number & tags.Type<"int32">;
  commentsPageSize: number & tags.Type<"int32">;
}): Promise<IDiscussionBoardArticle> {
  const { articleId, includeComments, commentsPage, commentsPageSize } = props;

  // Validate pagination when comments are requested (business logic)
  if (includeComments === "true") {
    const page = (commentsPage ?? 1) as number;
    const size = (commentsPageSize ?? 20) as number;
    if (page < 1 || size < 1 || size > 100) {
      throw new HttpException("Bad Request", 400);
    }
  }

  try {
    const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
      where: { id: articleId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            display_name: true,
            created_at: true,
          },
        },
        discussion_board_attachments: {
          where: { deleted_at: null },
          include: {
            uploader: {
              select: {
                id: true,
                username: true,
                display_name: true,
                created_at: true,
              },
            },
          },
          orderBy: { created_at: "asc" },
        },
        discussion_board_article_tags: { include: { tag: true } },
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
    });

    if (!article) throw new HttpException("Not Found", 404);
    if (article.deleted_at !== null) throw new HttpException("Not Found", 404);
    if (article.state !== "published")
      throw new HttpException("Not Found", 404);

    // Comments: fetched for validation/pagination purposes only because
    // IDiscussionBoardArticle DTO does not declare a comments property.
    if (includeComments === "true") {
      const page = (commentsPage ?? 1) as number;
      const size = (commentsPageSize ?? 20) as number;
      await MyGlobal.prisma.discussion_board_comments.findMany({
        where: {
          discussion_board_article_id: articleId,
          deleted_at: null,
          is_hidden: false,
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * size,
        take: size,
      });
    }

    const attachments = (article.discussion_board_attachments ?? []).map(
      (att) => {
        const uploader = att.uploader
          ? {
              id: att.uploader.id as string & tags.Format<"uuid">,
              username: att.uploader.username,
              display_name: att.uploader.display_name ?? null,
              created_at: toISOStringSafe(att.uploader.created_at),
            }
          : undefined;

        return {
          id: att.id as string & tags.Format<"uuid">,
          original_filename: att.original_filename,
          mime_type: att.mime_type,
          size: Number(att.size),
          is_image: att.is_image,
          created_at: toISOStringSafe(att.created_at),
          uploader: uploader ?? undefined,
          downloadUrl: null,
          cdnUrl: null,
        } satisfies IDiscussionBoardAttachment.ISummary;
      },
    );

    const tagsArray = (article.discussion_board_article_tags ?? []).map(
      (rel) => {
        const t = rel.tag;
        return {
          id: t.id as string & tags.Format<"uuid">,
          name: t.name,
          slug: t.slug,
          description: t.description ?? null,
          is_active: t.is_active,
          created_at: toISOStringSafe(t.created_at),
          updated_at: t.updated_at ? toISOStringSafe(t.updated_at) : null,
          deleted_at: t.deleted_at ? toISOStringSafe(t.deleted_at) : null,
        } satisfies IDiscussionBoardTag.ISummary;
      },
    );

    const category = article.category
      ? ({
          id: article.category.id as string & tags.Format<"uuid">,
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
        } satisfies IDiscussionBoardCategory.ISummary)
      : undefined;

    const authorSummary = article.author
      ? ({
          id: article.author.id as string & tags.Format<"uuid">,
          username: article.author.username,
          display_name: article.author.display_name ?? null,
          created_at: toISOStringSafe(article.author.created_at),
        } satisfies IDiscussionBoardMember.ISummary)
      : null;

    return {
      id: article.id as string & tags.Format<"uuid">,
      title: article.title,
      content: article.content,
      author: authorSummary,
      is_pinned: article.is_pinned,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
      attachments: attachments,
      state: article.state as
        | "draft"
        | "published"
        | "pending_review"
        | "hidden",
      published_at: article.published_at
        ? toISOStringSafe(article.published_at)
        : null,
      category: category,
      tags: tagsArray,
    } satisfies IDiscussionBoardArticle;
  } catch (error) {
    if (error instanceof HttpException) throw error;
    throw new HttpException("Internal Server Error", 500);
  }
}
