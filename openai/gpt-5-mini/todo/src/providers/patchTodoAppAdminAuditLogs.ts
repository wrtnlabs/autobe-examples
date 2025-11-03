import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";
import { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminAuditLogs(props: {
  admin: AdminPayload;
  body: ITodoAppAuditLog.IRequest;
}): Promise<IPageITodoAppAuditLog.ISummary> {
  const { admin, body } = props;

  // Authorization: ensure admin still active and not soft-deleted
  const adminRecord = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: admin.id },
    select: { id: true, is_active: true, deleted_at: true },
  });

  if (
    !adminRecord ||
    adminRecord.is_active !== true ||
    adminRecord.deleted_at !== null
  ) {
    throw new HttpException("Unauthorized: admin account is not active", 403);
  }

  // Pagination and bounds
  const currentPage = Number(body.page ?? 1);
  let limit = Number(body.limit ?? 20);
  if (!Number.isFinite(limit) || limit <= 0) limit = 20;
  const MAX_LIMIT = 100;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;
  const skip = (currentPage - 1) * limit;

  // Build where clause inline, respecting null vs undefined
  const where = {
    ...(body.eventType !== undefined &&
      body.eventType !== null && { event_type: body.eventType }),
    ...(body.targetType !== undefined &&
      body.targetType !== null && { target_type: body.targetType }),
    ...(body.userId !== undefined &&
      body.userId !== null && { todo_app_todouser_id: body.userId }),
    ...(body.adminId !== undefined &&
      body.adminId !== null && { todo_app_admin_id: body.adminId }),
    ...(body.listId !== undefined &&
      body.listId !== null && { todo_app_list_id: body.listId }),
    ...(body.taskId !== undefined &&
      body.taskId !== null && { todo_app_task_id: body.taskId }),
    ...(body.q !== undefined &&
      body.q !== null && { details: { contains: body.q } }),
    ...(body.includeDeleted !== true && { deleted_at: null }),
    ...((body.createdAfter !== undefined && body.createdAfter !== null) ||
    (body.createdBefore !== undefined && body.createdBefore !== null)
      ? {
          created_at: {
            ...(body.createdAfter !== undefined &&
              body.createdAfter !== null && { gte: body.createdAfter }),
            ...(body.createdBefore !== undefined &&
              body.createdBefore !== null && { lt: body.createdBefore }),
          },
        }
      : {}),
  };

  try {
    // Ensure direction is literal 'asc' | 'desc' so it matches Prisma SortOrder
    const direction = (body.order === "desc" ? "desc" : "asc") as
      | "asc"
      | "desc";

    const orderBy =
      body.sortBy === "eventType"
        ? { event_type: direction }
        : { created_at: direction };

    const [rows, total] = await Promise.all([
      MyGlobal.prisma.todo_app_audit_logs.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              display_name: true,
              is_verified: true,
              status: true,
              created_at: true,
              updated_at: true,
            },
          },
          admin: {
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
          },
          list: {
            select: {
              id: true,
              title: true,
              visibility: true,
              todo_app_todouser_id: true,
              description: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
              is_completed: true,
              due_date: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      }),
      MyGlobal.prisma.todo_app_audit_logs.count({ where }),
    ]);

    const data = rows.map((r) => {
      const user = r.user
        ? {
            id: r.user.id,
            displayName:
              r.user.display_name === null ? null : r.user.display_name,
            isVerified: r.user.is_verified,
            status: r.user.status === null ? undefined : r.user.status,
            createdAt: toISOStringSafe(r.user.created_at),
            updatedAt: toISOStringSafe(r.user.updated_at),
          }
        : undefined;

      const adminSummary = r.admin
        ? {
            id: r.admin.id,
            email: r.admin.email,
            displayName:
              r.admin.display_name === null ? null : r.admin.display_name,
            // Normalize role to the expected literal union (safe single-property assertion)
            role: typia.assert<"moderator" | "support" | "superadmin">(
              r.admin.role,
            ),
            isActive: r.admin.is_active,
            createdAt: toISOStringSafe(r.admin.created_at),
            updatedAt: r.admin.updated_at
              ? toISOStringSafe(r.admin.updated_at)
              : null,
            deletedAt: r.admin.deleted_at
              ? toISOStringSafe(r.admin.deleted_at)
              : null,
          }
        : undefined;

      const list = r.list
        ? {
            id: r.list.id,
            title: r.list.title,
            visibility: r.list.visibility,
            owner: {
              id: r.list.todo_app_todouser_id,
              displayName: undefined,
              isVerified: false,
              status: undefined,
              createdAt: toISOStringSafe(r.list.created_at),
              updatedAt: toISOStringSafe(r.list.updated_at),
            },
            description:
              r.list.description === null ? null : r.list.description,
            createdAt: toISOStringSafe(r.list.created_at),
            updatedAt: toISOStringSafe(r.list.updated_at),
            deletedAt: r.list.deleted_at
              ? toISOStringSafe(r.list.deleted_at)
              : null,
          }
        : undefined;

      // Build task summary without a nested 'list' property because we don't have nested list data here.
      // Omit 'list' rather than assigning null to avoid incompatible null assignment.
      const task = r.task
        ? {
            id: r.task.id,
            title: r.task.title,
            isCompleted: r.task.is_completed,
            dueDate: r.task.due_date ? toISOStringSafe(r.task.due_date) : null,
            createdAt: toISOStringSafe(r.task.created_at),
            updatedAt: toISOStringSafe(r.task.updated_at),
          }
        : undefined;

      return {
        id: r.id,
        eventType: r.event_type,
        targetType: r.target_type === null ? null : r.target_type,
        targetId: r.target_id === null ? null : r.target_id,
        user,
        admin: adminSummary,
        list,
        task,
        createdAt: toISOStringSafe(r.created_at),
        updatedAt: r.updated_at ? toISOStringSafe(r.updated_at) : null,
        deletedAt: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
      };
    });

    const pages = Math.max(1, Math.ceil(Number(total) / limit));

    const result = {
      pagination: {
        current: Number(currentPage),
        limit: Number(limit),
        records: Number(total),
        pages: Number(pages),
      },
      data,
    };

    // Final cast: strip typia tag incompatibilities and satisfy the declared return type.
    return result as unknown as IPageITodoAppAuditLog.ISummary;
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }
}
