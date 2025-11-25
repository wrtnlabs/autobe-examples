import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorModeratorsModeratorIdModerationLogs(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: IDiscussionBoardModerationLog.IRequest;
}): Promise<IPageIDiscussionBoardModerationLog> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";

  const [logs, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderation_logs.findMany({
      where: {
        ...(props.body.action_types &&
          props.body.action_types.length > 0 && {
            action_type: { in: props.body.action_types },
          }),
        ...(props.body.moderator_id && {
          discussion_board_moderator_id: props.body.moderator_id,
        }),
        ...(props.body.article_id && {
          discussion_board_article_id: props.body.article_id,
        }),
        ...(props.body.member_id && {
          discussion_board_member_id: props.body.member_id,
        }),
        ...((props.body.from_date || props.body.to_date) && {
          created_at: {
            ...(props.body.from_date && {
              gte: new Date(props.body.from_date),
            }),
            ...(props.body.to_date && { lte: new Date(props.body.to_date) }),
          },
        }),
      },
      skip,
      take: limit,
      orderBy: {
        [sortBy]: order,
      },
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
    }),
    MyGlobal.prisma.discussion_board_moderation_logs.count({
      where: {
        ...(props.body.action_types &&
          props.body.action_types.length > 0 && {
            action_type: { in: props.body.action_types },
          }),
        ...(props.body.moderator_id && {
          discussion_board_moderator_id: props.body.moderator_id,
        }),
        ...(props.body.article_id && {
          discussion_board_article_id: props.body.article_id,
        }),
        ...(props.body.member_id && {
          discussion_board_member_id: props.body.member_id,
        }),
        ...((props.body.from_date || props.body.to_date) && {
          created_at: {
            ...(props.body.from_date && {
              gte: new Date(props.body.from_date),
            }),
            ...(props.body.to_date && { lte: new Date(props.body.to_date) }),
          },
        }),
      },
    }),
  ]);

  return {
    data: logs.map((log) => ({
      id: log.id as string & tags.Format<"uuid">,
      discussion_board_moderator_id:
        log.discussion_board_moderator_id as string & tags.Format<"uuid">,
      moderator: {
        id: log.moderator.id as string & tags.Format<"uuid">,
        email: log.moderator.email as string & tags.Format<"email">,
        username: log.moderator.username,
        display_name: log.moderator.display_name,
        email_verified: log.moderator.email_verified,
        email_verified_at: log.moderator.email_verified_at
          ? toISOStringSafe(log.moderator.email_verified_at)
          : null,
        is_active: log.moderator.is_active,
        last_login_at: log.moderator.last_login_at
          ? toISOStringSafe(log.moderator.last_login_at)
          : null,
        created_at: toISOStringSafe(log.moderator.created_at),
        updated_at: toISOStringSafe(log.moderator.updated_at),
        deleted_at: log.moderator.deleted_at
          ? toISOStringSafe(log.moderator.deleted_at)
          : null,
      },
      action_type: log.action_type,
      reason: log.reason,
      action_details:
        log.action_details === null ? undefined : log.action_details,
      discussion_board_article_id:
        log.discussion_board_article_id === null
          ? undefined
          : (log.discussion_board_article_id as string & tags.Format<"uuid">),
      article: log.article
        ? {
            id: log.article.id as string & tags.Format<"uuid">,
            title: log.article.title as string &
              tags.MinLength<5> &
              tags.MaxLength<200>,
            slug: log.article.slug,
            excerpt: log.article.excerpt,
            status: log.article.status as "draft" | "published" | "archived",
            view_count: log.article.view_count as number &
              tags.Type<"int32"> &
              tags.Minimum<0>,
            published_at: log.article.published_at
              ? toISOStringSafe(log.article.published_at)
              : null,
            created_at: toISOStringSafe(log.article.created_at),
            updated_at: toISOStringSafe(log.article.updated_at),
            is_edited: log.article.is_edited,
            discussion_board_article_category_id: log.article
              .discussion_board_article_category_id as string &
              tags.Format<"uuid">,
            discussion_board_member_id: log.article
              .discussion_board_member_id as string & tags.Format<"uuid">,
            deleted_at: log.article.deleted_at
              ? toISOStringSafe(log.article.deleted_at)
              : null,
            category: {
              id: log.article.category.id as string & tags.Format<"uuid">,
              name: log.article.category.name,
              slug: log.article.category.slug,
              description: log.article.category.description,
              sort_order: log.article.category.sort_order as number &
                tags.Type<"int32">,
              created_at: toISOStringSafe(log.article.category.created_at),
              updated_at: toISOStringSafe(log.article.category.updated_at),
            },
            author: {
              id: log.article.author.id as string & tags.Format<"uuid">,
              username: log.article.author.username,
              display_name: log.article.author.display_name,
            },
          }
        : undefined,
      discussion_board_member_id:
        log.discussion_board_member_id === null
          ? undefined
          : (log.discussion_board_member_id as string & tags.Format<"uuid">),
      affectedMember: log.affectedMember
        ? {
            id: log.affectedMember.id as string & tags.Format<"uuid">,
            username: log.affectedMember.username,
            display_name: log.affectedMember.display_name,
          }
        : undefined,
      created_at: toISOStringSafe(log.created_at),
    })),
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
