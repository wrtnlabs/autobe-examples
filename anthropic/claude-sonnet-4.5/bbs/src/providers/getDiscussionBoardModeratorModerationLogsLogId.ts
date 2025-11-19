import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorModerationLogsLogId(props: {
  moderator: ModeratorPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModerationLog> {
  const log = await MyGlobal.prisma.discussion_board_moderation_logs.findUnique(
    {
      where: { id: props.logId },
      include: {
        moderator: true,
        article: {
          include: {
            category: true,
            author: true,
          },
        },
        affectedMember: true,
      },
    },
  );

  if (!log) {
    throw new HttpException("Moderation log not found", 404);
  }

  return {
    id: log.id,
    discussion_board_moderator_id: log.discussion_board_moderator_id,
    moderator: {
      id: log.moderator.id,
      email: log.moderator.email,
      username: log.moderator.username,
      display_name: log.moderator.display_name ?? undefined,
      email_verified: log.moderator.email_verified,
      email_verified_at: log.moderator.email_verified_at
        ? toISOStringSafe(log.moderator.email_verified_at)
        : undefined,
      is_active: log.moderator.is_active,
      last_login_at: log.moderator.last_login_at
        ? toISOStringSafe(log.moderator.last_login_at)
        : undefined,
      created_at: toISOStringSafe(log.moderator.created_at),
      updated_at: toISOStringSafe(log.moderator.updated_at),
      deleted_at: log.moderator.deleted_at
        ? toISOStringSafe(log.moderator.deleted_at)
        : undefined,
    },
    action_type: log.action_type,
    reason: log.reason,
    action_details: log.action_details ?? undefined,
    discussion_board_article_id: log.discussion_board_article_id
      ? log.discussion_board_article_id
      : undefined,
    article: log.article
      ? {
          id: log.article.id,
          title: log.article.title,
          slug: log.article.slug,
          excerpt: log.article.excerpt ?? undefined,
          status: typia.assert<"draft" | "published" | "archived">(
            log.article.status,
          ),
          view_count: log.article.view_count,
          published_at: log.article.published_at
            ? toISOStringSafe(log.article.published_at)
            : undefined,
          created_at: toISOStringSafe(log.article.created_at),
          updated_at: toISOStringSafe(log.article.updated_at),
          is_edited: log.article.is_edited,
          discussion_board_article_category_id:
            log.article.discussion_board_article_category_id,
          discussion_board_member_id: log.article.discussion_board_member_id,
          deleted_at: log.article.deleted_at
            ? toISOStringSafe(log.article.deleted_at)
            : undefined,
          category: {
            id: log.article.category.id,
            name: log.article.category.name,
            slug: log.article.category.slug,
            description: log.article.category.description ?? undefined,
            sort_order: log.article.category.sort_order,
            created_at: toISOStringSafe(log.article.category.created_at),
            updated_at: toISOStringSafe(log.article.category.updated_at),
          },
          author: {
            id: log.article.author.id,
            username: log.article.author.username,
            display_name: log.article.author.display_name ?? undefined,
          },
        }
      : undefined,
    discussion_board_member_id: log.discussion_board_member_id
      ? log.discussion_board_member_id
      : undefined,
    affectedMember: log.affectedMember
      ? {
          id: log.affectedMember.id,
          username: log.affectedMember.username,
          display_name: log.affectedMember.display_name ?? undefined,
        }
      : undefined,
    created_at: toISOStringSafe(log.created_at),
  };
}
