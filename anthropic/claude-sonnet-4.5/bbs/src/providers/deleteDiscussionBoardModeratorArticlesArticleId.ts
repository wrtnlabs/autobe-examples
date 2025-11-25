import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function deleteDiscussionBoardModeratorArticlesArticleId(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticle> {
  const existing = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    include: {
      category: true,
      author: true,
    },
  });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }

  const deleted = await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
    include: {
      category: true,
      author: true,
    },
  });

  return {
    id: deleted.id,
    title: deleted.title,
    slug: deleted.slug,
    body: deleted.body,
    excerpt: deleted.excerpt === null ? undefined : deleted.excerpt,
    status: typia.assert<"draft" | "published" | "archived">(deleted.status),
    view_count: deleted.view_count,
    is_edited: deleted.is_edited,
    published_at:
      deleted.published_at === null
        ? undefined
        : toISOStringSafe(deleted.published_at),
    created_at: toISOStringSafe(deleted.created_at),
    updated_at: toISOStringSafe(deleted.updated_at),
    deleted_at: deleted.deleted_at
      ? toISOStringSafe(deleted.deleted_at)
      : undefined,
    author: {
      id: deleted.author.id,
      username: deleted.author.username,
      display_name:
        deleted.author.display_name === null
          ? undefined
          : deleted.author.display_name,
    },
    category: {
      id: deleted.category.id,
      name: deleted.category.name,
      slug: deleted.category.slug,
      description:
        deleted.category.description === null
          ? undefined
          : deleted.category.description,
      sort_order: deleted.category.sort_order,
      created_at: toISOStringSafe(deleted.category.created_at),
      updated_at: toISOStringSafe(deleted.category.updated_at),
    },
  };
}
