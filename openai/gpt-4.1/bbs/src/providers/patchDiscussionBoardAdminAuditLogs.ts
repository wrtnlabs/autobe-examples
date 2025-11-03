import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAuditLog.IRequest;
}): Promise<IPageIDiscussionBoardAuditLog.ISummary> {
  const { body } = props;

  const page = body.page;
  const limit = body.limit;

  // Build where clause only from provided filters
  const where = {
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.length > 0 && {
        audit_details: { contains: body.search },
      }),
    ...(body.admin_id !== undefined &&
      body.admin_id !== null && {
        actor_admin_id: body.admin_id,
      }),
    ...(body.event_type !== undefined &&
      body.event_type !== null && {
        audit_event_type: body.event_type,
      }),
    ...(body.target_article_id !== undefined &&
      body.target_article_id !== null && {
        target_article_id: body.target_article_id,
      }),
    ...(body.target_comment_id !== undefined &&
      body.target_comment_id !== null && {
        target_comment_id: body.target_comment_id,
      }),
    ...(body.from !== undefined &&
    body.from !== null &&
    body.to !== undefined &&
    body.to !== null
      ? {
          created_at: {
            gte: body.from,
            lte: body.to,
          },
        }
      : body.from !== undefined && body.from !== null
        ? {
            created_at: {
              gte: body.from,
            },
          }
        : body.to !== undefined && body.to !== null
          ? {
              created_at: {
                lte: body.to,
              },
            }
          : {}),
  };

  const orderByField =
    body.order_by === "event_type" ? "audit_event_type" : "created_at";
  const orderByDirection = body.order_dir === "asc" ? "asc" : "desc";

  const [logs, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_audit_logs.findMany({
      where,
      orderBy: { [orderByField]: orderByDirection },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      select: {
        id: true,
        actor_admin_id: true,
        target_article_id: true,
        target_comment_id: true,
        moderation_action_id: true,
        audit_event_type: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_audit_logs.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: logs.map((log) => ({
      id: log.id,
      actor_admin_id: log.actor_admin_id,
      target_article_id: log.target_article_id ?? undefined,
      target_comment_id: log.target_comment_id ?? undefined,
      moderation_action_id: log.moderation_action_id,
      audit_event_type: log.audit_event_type,
      created_at: toISOStringSafe(log.created_at),
    })),
  };
}
