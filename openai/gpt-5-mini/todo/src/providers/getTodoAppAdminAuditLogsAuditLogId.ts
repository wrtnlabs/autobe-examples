import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";
import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";
import { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminAuditLogsAuditLogId(props: {
  admin: AdminPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<ITodoAppAuditLog> {
  const { admin, auditLogId } = props;

  const adminRecord = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: admin.id },
    select: { id: true, is_active: true, deleted_at: true },
  });

  if (
    !adminRecord ||
    adminRecord.is_active !== true ||
    adminRecord.deleted_at !== null
  ) {
    throw new HttpException("Unauthorized", 403);
  }

  const record = await MyGlobal.prisma.todo_app_audit_logs.findUnique({
    where: { id: auditLogId },
    select: {
      id: true,
      todo_app_admin_id: true,
      todo_app_admin_session_id: true,
      todo_app_todouser_id: true,
      todo_app_todouser_session_id: true,
      todo_app_list_id: true,
      todo_app_task_id: true,
      event_type: true,
      target_type: true,
      target_id: true,
      details: true,
      ip: true,
      href: true,
      user_agent: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!record) throw new HttpException("Not Found", 404);

  const fetchAdminSummary = async (id: string | null) => {
    if (!id) return null;
    const a = await MyGlobal.prisma.todo_app_admin.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        display_name: true,
        role: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    if (!a) return null;
    const role = (
      a.role === "moderator" || a.role === "support" || a.role === "superadmin"
        ? a.role
        : "support"
    ) as "moderator" | "support" | "superadmin";

    return {
      id: a.id,
      email: a.email,
      displayName: a.display_name ?? null,
      role,
      isActive: a.is_active,
      createdAt: toISOStringSafe(a.created_at),
      updatedAt: a.updated_at ? toISOStringSafe(a.updated_at) : null,
      deletedAt: a.deleted_at ? toISOStringSafe(a.deleted_at) : null,
    };
  };

  const fetchAdminSessionSummary = async (id: string | null) => {
    if (!id) return null;
    const s = await MyGlobal.prisma.todo_app_admin_sessions.findUnique({
      where: { id },
      select: {
        id: true,
        todo_app_admin_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });
    if (!s) return null;
    const adminSummary = await fetchAdminSummary(s.todo_app_admin_id);
    if (!adminSummary) return null;
    return {
      id: s.id,
      admin: adminSummary,
      ip: s.ip,
      href: s.href,
      referrer: s.referrer,
      createdAt: toISOStringSafe(s.created_at),
      expiredAt: s.expired_at ? toISOStringSafe(s.expired_at) : null,
    };
  };

  const fetchUserSummary = async (id: string | null) => {
    if (!id) return null;
    const u = await MyGlobal.prisma.todo_app_todouser.findUnique({
      where: { id },
      select: {
        id: true,
        display_name: true,
        is_verified: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });
    if (!u) return null;
    return {
      id: u.id,
      displayName: u.display_name ?? null,
      isVerified: u.is_verified,
      status: u.status ?? undefined,
      createdAt: toISOStringSafe(u.created_at),
      updatedAt: toISOStringSafe(u.updated_at),
    };
  };

  const fetchUserSessionSummary = async (id: string | null) => {
    if (!id) return null;
    const s = await MyGlobal.prisma.todo_app_todouser_sessions.findUnique({
      where: { id },
      select: {
        id: true,
        todo_app_todouser_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });
    if (!s) return null;
    const userSummary = await fetchUserSummary(s.todo_app_todouser_id);
    if (!userSummary) return null;
    return {
      id: s.id,
      user: userSummary,
      ip: s.ip,
      href: s.href ?? undefined,
      referrer: s.referrer ?? null,
      createdAt: toISOStringSafe(s.created_at),
      expiredAt: s.expired_at ? toISOStringSafe(s.expired_at) : null,
    };
  };

  const fetchListSummary = async (id: string | null) => {
    if (!id) return null;
    const l = await MyGlobal.prisma.todo_app_lists.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        visibility: true,
        description: true,
        todo_app_todouser_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    if (!l) return null;
    const owner = await fetchUserSummary(l.todo_app_todouser_id);
    if (!owner) return null;
    return {
      id: l.id,
      title: l.title,
      visibility: l.visibility,
      owner,
      description: l.description ?? null,
      createdAt: toISOStringSafe(l.created_at),
      updatedAt: toISOStringSafe(l.updated_at),
      deletedAt: l.deleted_at ? toISOStringSafe(l.deleted_at) : null,
    };
  };

  const fetchTaskSummary = async (id: string | null) => {
    if (!id) return null;
    const t = await MyGlobal.prisma.todo_app_tasks.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        is_completed: true,
        due_date: true,
        todo_app_list_id: true,
        created_at: true,
        updated_at: true,
      },
    });
    if (!t) return null;
    const listSummary = await fetchListSummary(t.todo_app_list_id);
    if (!listSummary) return null;
    return {
      id: t.id,
      title: t.title,
      isCompleted: t.is_completed,
      dueDate: t.due_date ? toISOStringSafe(t.due_date) : null,
      createdAt: toISOStringSafe(t.created_at),
      updatedAt: toISOStringSafe(t.updated_at),
      list: listSummary,
    };
  };

  const [
    adminSummary,
    adminSessionSummary,
    userSummary,
    userSessionSummary,
    listSummary,
    taskSummary,
  ] = await Promise.all([
    fetchAdminSummary(record.todo_app_admin_id),
    fetchAdminSessionSummary(record.todo_app_admin_session_id),
    fetchUserSummary(record.todo_app_todouser_id),
    fetchUserSessionSummary(record.todo_app_todouser_session_id),
    fetchListSummary(record.todo_app_list_id),
    fetchTaskSummary(record.todo_app_task_id),
  ]);

  const result: ITodoAppAuditLog = {
    id: record.id as string & tags.Format<"uuid">,
    admin: adminSummary ?? null,
    adminSession: adminSessionSummary ?? null,
    user: userSummary ?? null,
    userSession: userSessionSummary ?? null,
    list: listSummary ?? null,
    task: taskSummary ?? null,
    eventType: record.event_type,
    targetType: record.target_type ?? null,
    targetId: record.target_id
      ? (record.target_id as string & tags.Format<"uuid">)
      : null,
    details: record.details ?? null,
    ip: record.ip ?? null,
    href: record.href ?? null,
    userAgent: record.user_agent ?? null,
    createdAt: toISOStringSafe(record.created_at),
    updatedAt: record.updated_at
      ? toISOStringSafe(record.updated_at)
      : undefined,
    deletedAt: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };

  return result;
}
