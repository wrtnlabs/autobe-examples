import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardAdminAnalyticsModerationEfficiency(props: {
  admin: AdminPayload;
  body: IDiscussionBoardModerationLog.IRequest;
}): Promise<IPageIDiscussionBoardModerationLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE conditions for moderation logs
  const logsWhereInput = {
    deleted_at: null,
    ...(props.body.action_type && { action_type: props.body.action_type }),
    ...(props.body.admin_id && { admin_id: props.body.admin_id }),
    ...(props.body.super_admin_id && {
      super_admin_id: props.body.super_admin_id,
    }),
    ...(props.body.target_article_id && {
      target_article_id: props.body.target_article_id,
    }),
    ...(props.body.target_comment_id && {
      target_comment_id: props.body.target_comment_id,
    }),
    ...(props.body.target_user_id && {
      target_user_id: props.body.target_user_id,
    }),
    ...(props.body.target_section_id && {
      target_section_id: props.body.target_section_id,
    }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.performed_at_from && {
      performed_at: { gte: toISOStringSafe(props.body.performed_at_from) },
    }),
    ...(props.body.performed_at_to && {
      performed_at: { lte: toISOStringSafe(props.body.performed_at_to) },
    }),
    ...(props.body.scheduled_at_from && {
      scheduled_at: { gte: toISOStringSafe(props.body.scheduled_at_from) },
    }),
    ...(props.body.scheduled_at_to && {
      scheduled_at: { lte: toISOStringSafe(props.body.scheduled_at_to) },
    }),
    ...(props.body.completed_at_from && {
      completed_at: { gte: toISOStringSafe(props.body.completed_at_from) },
    }),
    ...(props.body.completed_at_to && {
      completed_at: { lte: toISOStringSafe(props.body.completed_at_to) },
    }),
    ...(props.body.action_description_search && {
      action_description: {
        contains: props.body.action_description_search,
        mode: "insensitive",
      },
    }),
  } satisfies Prisma.discussion_board_moderation_logsWhereInput;
  // Query moderation logs with related entities for analytics
  const logs = await MyGlobal.prisma.discussion_board_moderation_logs.findMany({
    where: logsWhereInput,
    skip,
    take: limit,
    orderBy: { performed_at: "desc" },
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          display_name: true,
          created_at: true,
        },
      },
      superAdmin: {
        select: {
          id: true,
          email: true,
          privilege_level: true,
          created_at: true,
        },
      },
      targetArticle: {
        select: {
          id: true,
          title: true,
          status: true,
          created_at: true,
          author: {
            select: {
              id: true,
              display_name: true,
            },
          },
          section: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      targetComment: {
        select: {
          id: true,
          content: true,
          created_at: true,
        },
      },
      targetUser: {
        select: {
          id: true,
          display_name: true,
          bio: true,
          created_at: true,
          updated_at: true,
        },
      },
      targetSection: {
        select: {
          id: true,
          name: true,
          status: true,
          display_order: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.discussion_board_moderation_logs.count({
    where: logsWhereInput,
  });
  // Transform the data to match the response DTO
  const data = logs.map((log) => ({
    id: log.id as string & tags.Format<"uuid">,
    action_type: log.action_type,
    action_description: log.action_description,
    performed_at: toISOStringSafe(log.performed_at),
    status: log.status,
    admin: log.admin
      ? {
          id: log.admin.id as string & tags.Format<"uuid">,
          email: log.admin.email as string & tags.Format<"email">,
          display_name: log.admin.display_name,
          created_at: toISOStringSafe(log.admin.created_at),
        }
      : null,
    superAdmin: log.superAdmin
      ? {
          id: log.superAdmin.id as string & tags.Format<"uuid">,
          email: log.superAdmin.email as string & tags.Format<"email">,
          privilege_level: log.superAdmin.privilege_level,
          created_at: toISOStringSafe(log.superAdmin.created_at),
        }
      : null,
    targetArticle: log.targetArticle
      ? {
          id: log.targetArticle.id as string & tags.Format<"uuid">,
          title: log.targetArticle.title,
          status: log.targetArticle.status,
          created_at: toISOStringSafe(log.targetArticle.created_at),
          author: log.targetArticle.author
            ? {
                id: log.targetArticle.author.id as string & tags.Format<"uuid">,
                display_name: log.targetArticle.author.display_name,
              }
            : null,
          section: log.targetArticle.section
            ? {
                id: log.targetArticle.section.id as string &
                  tags.Format<"uuid">,
                name: log.targetArticle.section.name,
              }
            : null,
        }
      : null,
    targetComment: log.targetComment
      ? {
          id: log.targetComment.id as string & tags.Format<"uuid">,
          content: log.targetComment.content,
          created_at: toISOStringSafe(log.targetComment.created_at),
        }
      : null,
    targetUser: log.targetUser
      ? {
          id: log.targetUser.id as string & tags.Format<"uuid">,
          display_name: log.targetUser.display_name,
          bio: log.targetUser.bio,
          created_at: toISOStringSafe(log.targetUser.created_at),
          updated_at: toISOStringSafe(log.targetUser.updated_at),
        }
      : null,
    targetSection: log.targetSection
      ? {
          id: log.targetSection.id as string & tags.Format<"uuid">,
          name: log.targetSection.name,
          status: log.targetSection.status,
          display_order: log.targetSection.display_order,
        }
      : null,
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: typia.assert<IDiscussionBoardModerationLog.ISummary[]>(data),
  };
}
