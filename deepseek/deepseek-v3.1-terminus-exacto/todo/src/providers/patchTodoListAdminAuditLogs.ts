import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAuditLog";
import { IPageITodoListAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminAuditLogs(props: {
  admin: AdminPayload;
  body: ITodoListAuditLog.IRequest;
}): Promise<IPageITodoListAuditLog.ISummary> {
  const {
    event_action,
    event_status,
    actor_user_id,
    actor_admin_id,
    affected_todo_id,
    since,
    until,
    page = 1,
    page_size = 100,
    sort_by = "created_at",
    sort_direction = "desc",
  } = props.body || {};

  // Only 'created_at' is supported for sorting
  const orderByField = sort_by;
  const orderDirection = sort_direction === "asc" ? "asc" : "desc";
  const take = Math.max(1, Math.min(Number(page_size), 500));
  const skip = (Number(page) - 1) * take;

  // Build the dynamic Prisma where condition
  const where: Record<string, any> = {
    ...(event_action !== undefined && { event_action }),
    ...(event_status !== undefined && { event_status }),
    ...(actor_user_id !== undefined && { actor_user_id }),
    ...(actor_admin_id !== undefined && { actor_admin_id }),
    ...(affected_todo_id !== undefined && { affected_todo_id }),
    ...(since || until
      ? {
          created_at: {
            ...(since !== undefined && { gte: since }),
            ...(until !== undefined && { lte: until }),
          },
        }
      : {}),
  };

  // Find audit logs and count for pagination
  const [records, total] = await Promise.all([
    MyGlobal.prisma.todo_list_audit_logs.findMany({
      where,
      skip,
      take,
      orderBy: { [orderByField]: orderDirection },
    }),
    MyGlobal.prisma.todo_list_audit_logs.count({ where }),
  ]);

  // Map Prisma rows to ISummary output
  const data = records.map((log) => ({
    id: log.id,
    actor_user_id: log.actor_user_id === null ? undefined : log.actor_user_id,
    actor_admin_id:
      log.actor_admin_id === null ? undefined : log.actor_admin_id,
    actor_user_session_id:
      log.actor_user_session_id === null
        ? undefined
        : log.actor_user_session_id,
    actor_admin_session_id:
      log.actor_admin_session_id === null
        ? undefined
        : log.actor_admin_session_id,
    affected_todo_id:
      log.affected_todo_id === null ? undefined : log.affected_todo_id,
    event_action: log.event_action,
    event_status: log.event_status,
    event_context: log.event_context === null ? undefined : log.event_context,
    ip_address: log.ip_address === null ? undefined : log.ip_address,
    user_agent: log.user_agent === null ? undefined : log.user_agent,
    created_at: toISOStringSafe(log.created_at),
  }));

  const pages = Math.ceil(total / take);

  return {
    pagination: {
      current: Number(page),
      limit: take,
      records: total,
      pages,
    },
    data,
  };
}
