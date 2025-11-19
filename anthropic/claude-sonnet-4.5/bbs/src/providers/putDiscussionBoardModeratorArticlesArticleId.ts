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
import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putDiscussionBoardModeratorArticlesArticleId(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  const existing = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    include: {
      category: true,
      author: true,
    },
  });

  if (!existing) {
    throw new HttpException("Article not found", 404);
  }

  if (existing.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }

  const currentTime = new Date();
  const isCurrentlyPublished = existing.status === "published";
  const isBeingModified =
    props.body.title !== undefined ||
    props.body.body !== undefined ||
    props.body.slug !== undefined ||
    props.body.excerpt !== undefined ||
    props.body.discussion_board_article_category_id !== undefined;

  const updated = await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.slug !== undefined && { slug: props.body.slug }),
      ...(props.body.body !== undefined && { body: props.body.body }),
      ...(props.body.excerpt !== undefined && { excerpt: props.body.excerpt }),
      ...(props.body.discussion_board_article_category_id !== undefined && {
        discussion_board_article_category_id:
          props.body.discussion_board_article_category_id,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      updated_at: currentTime,
      ...(isCurrentlyPublished && isBeingModified && { is_edited: true }),
      ...(props.body.status === "published" &&
        existing.published_at === null && {
          published_at: currentTime,
        }),
    },
    include: {
      category: true,
      author: true,
    },
  });

  return {
    id: updated.id,
    title: updated.title,
    slug: updated.slug,
    body: updated.body,
    excerpt: updated.excerpt,
    status: typia.assert<"draft" | "published" | "archived">(updated.status),
    view_count: updated.view_count,
    is_edited: updated.is_edited,
    published_at: updated.published_at
      ? toISOStringSafe(updated.published_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    author: {
      id: updated.author.id,
      username: updated.author.username,
      display_name: updated.author.display_name,
    },
    category: {
      id: updated.category.id,
      name: updated.category.name,
      slug: updated.category.slug,
      description: updated.category.description,
      sort_order: updated.category.sort_order,
      created_at: toISOStringSafe(updated.category.created_at),
      updated_at: toISOStringSafe(updated.category.updated_at),
    },
  };
}
