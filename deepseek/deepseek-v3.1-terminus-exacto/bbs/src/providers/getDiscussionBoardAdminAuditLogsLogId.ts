import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getDiscussionBoardAdminAuditLogsLogId(props: {
  admin: AdminPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAuditLog> {
  const auditLog = await MyGlobal.prisma.discussion_board_audit_logs.findUnique(
    {
      where: { id: props.logId },
      select: {
        id: true,
        actor_id: true,
        target_user_id: true,
        target_admin_id: true,
        target_super_admin_id: true,
        target_article_id: true,
        target_comment_id: true,
        target_section_id: true,
        actor_type: true,
        action_type: true,
        action_subtype: true,
        description: true,
        ip_address: true,
        user_agent: true,
        metadata: true,
        success: true,
        error_message: true,
        created_at: true,
        updated_at: true,
        actor: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          },
        },
        targetAdmin: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          },
        },
        targetSuperAdmin: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          },
        },
        targetArticle: {
          select: {
            id: true,
            title: true,
            section: { select: { id: true } },
            created_at: true,
          },
        },
        targetComment: {
          select: {
            id: true,
            content: true,
            article: { select: { id: true } },
            created_at: true,
          },
        },
        targetSection: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
          },
        },
      },
    },
  );
  if (!auditLog) {
    throw new HttpException("Audit log not found", 404);
  }
  // Transform the audit log data
  const result: IDiscussionBoardAuditLog = {
    id: auditLog.id,
    actor_id: auditLog.actor_id === null ? undefined : auditLog.actor_id,
    target_user_id:
      auditLog.target_user_id === null ? undefined : auditLog.target_user_id,
    target_admin_id:
      auditLog.target_admin_id === null ? undefined : auditLog.target_admin_id,
    target_super_admin_id:
      auditLog.target_super_admin_id === null
        ? undefined
        : auditLog.target_super_admin_id,
    target_article_id:
      auditLog.target_article_id === null
        ? undefined
        : auditLog.target_article_id,
    target_comment_id:
      auditLog.target_comment_id === null
        ? undefined
        : auditLog.target_comment_id,
    target_section_id:
      auditLog.target_section_id === null
        ? undefined
        : auditLog.target_section_id,
    actor_type: auditLog.actor_type,
    action_type: auditLog.action_type,
    action_subtype:
      auditLog.action_subtype === null ? undefined : auditLog.action_subtype,
    description: auditLog.description,
    ip_address: auditLog.ip_address === null ? undefined : auditLog.ip_address,
    user_agent: auditLog.user_agent === null ? undefined : auditLog.user_agent,
    metadata: auditLog.metadata === null ? undefined : auditLog.metadata,
    success: auditLog.success,
    error_message:
      auditLog.error_message === null ? undefined : auditLog.error_message,
    created_at: toISOStringSafe(auditLog.created_at),
    updated_at: toISOStringSafe(auditLog.updated_at),
    ...(auditLog.actor && {
      actor: {
        id: auditLog.actor.id,
        email: auditLog.actor.email,
        display_name: auditLog.actor.display_name,
        created_at: toISOStringSafe(auditLog.actor.created_at),
      },
    }),
    ...(auditLog.targetUser && {
      targetUser: {
        id: auditLog.targetUser.id,
        email: auditLog.targetUser.email,
        display_name: auditLog.targetUser.display_name,
        created_at: toISOStringSafe(auditLog.targetUser.created_at),
      },
    }),
    ...(auditLog.targetAdmin && {
      targetAdmin: {
        id: auditLog.targetAdmin.id,
        email: auditLog.targetAdmin.email,
        display_name: auditLog.targetAdmin.display_name,
        created_at: toISOStringSafe(auditLog.targetAdmin.created_at),
      },
    }),
    ...(auditLog.targetSuperAdmin && {
      targetSuperAdmin: {
        id: auditLog.targetSuperAdmin.id,
        email: auditLog.targetSuperAdmin.email,
        display_name: auditLog.targetSuperAdmin.display_name,
        created_at: toISOStringSafe(auditLog.targetSuperAdmin.created_at),
      },
    }),
    ...(auditLog.targetArticle && {
      targetArticle: {
        id: auditLog.targetArticle.id,
        title: auditLog.targetArticle.title,
        section_id: auditLog.targetArticle.section?.id ?? null,
        created_at: toISOStringSafe(auditLog.targetArticle.created_at),
      },
    }),
    ...(auditLog.targetComment && {
      targetComment: {
        id: auditLog.targetComment.id,
        content: auditLog.targetComment.content,
        article_id: auditLog.targetComment.article?.id ?? null,
        created_at: toISOStringSafe(auditLog.targetComment.created_at),
      },
    }),
    ...(auditLog.targetSection && {
      targetSection: {
        id: auditLog.targetSection.id,
        name: auditLog.targetSection.name,
        description: auditLog.targetSection.description,
        created_at: toISOStringSafe(auditLog.targetSection.created_at),
      },
    }),
  };
  return result;
}
