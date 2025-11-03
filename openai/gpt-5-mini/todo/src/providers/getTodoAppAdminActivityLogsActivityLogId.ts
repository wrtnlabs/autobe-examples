import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUserActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserActivityLog";
import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";
import { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminActivityLogsActivityLogId(props: {
  admin: AdminPayload;
  activityLogId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUserActivityLog> {
  const { admin, activityLogId } = props;

  const activity = await MyGlobal.prisma.todo_app_user_activity_logs.findUnique(
    {
      where: { id: activityLogId },
    },
  );
  if (!activity) throw new HttpException("Not Found", 404);

  const adminRecord = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: admin.id },
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

  if (!adminRecord || !adminRecord.is_active || adminRecord.deleted_at) {
    throw new HttpException("Unauthorized", 403);
  }

  if (activity.deleted_at && adminRecord.role !== "superadmin") {
    throw new HttpException("Not Found", 404);
  }

  await MyGlobal.prisma.todo_app_admin_actions.create({
    data: {
      id: v4(),
      todo_app_admin_id: admin.id,
      todo_app_admin_session_id: admin.session_id,
      todo_app_todouser_id: null,
      action: "view_activity_log",
      reason: null,
      target_type: "activity_log",
      target_id: activity.id,
      details: null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  const [userRow, userSessionRow, listRow, taskRow] = await Promise.all([
    activity.todo_app_todouser_id
      ? MyGlobal.prisma.todo_app_todouser.findUnique({
          where: { id: activity.todo_app_todouser_id },
          select: {
            id: true,
            display_name: true,
            is_verified: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        })
      : Promise.resolve(null as null),

    activity.todo_app_todouser_session_id
      ? MyGlobal.prisma.todo_app_todouser_sessions.findUnique({
          where: { id: activity.todo_app_todouser_session_id },
          select: {
            id: true,
            todo_app_todouser_id: true,
            ip: true,
            href: true,
            referrer: true,
            created_at: true,
            expired_at: true,
          },
        })
      : Promise.resolve(null as null),

    activity.todo_app_list_id
      ? MyGlobal.prisma.todo_app_lists.findUnique({
          where: { id: activity.todo_app_list_id },
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
        })
      : Promise.resolve(null as null),

    activity.todo_app_task_id
      ? MyGlobal.prisma.todo_app_tasks.findUnique({
          where: { id: activity.todo_app_task_id },
          select: {
            id: true,
            title: true,
            is_completed: true,
            due_date: true,
            created_at: true,
            updated_at: true,
            todo_app_list_id: true,
            deleted_at: true,
          },
        })
      : Promise.resolve(null as null),
  ]);

  const userSummary = userRow
    ? {
        id: userRow.id,
        displayName: userRow.display_name ?? null,
        isVerified: userRow.is_verified,
        status: userRow.status ?? undefined,
        createdAt: toISOStringSafe(userRow.created_at),
        updatedAt: toISOStringSafe(userRow.updated_at),
      }
    : undefined;

  let finalUserForSession: ITodoAppTodoUser.ISummary | null = null;
  if (userSummary)
    finalUserForSession = userSummary as ITodoAppTodoUser.ISummary;
  else if (userSessionRow && userSessionRow.todo_app_todouser_id) {
    const sessionUser = await MyGlobal.prisma.todo_app_todouser.findUnique({
      where: { id: userSessionRow.todo_app_todouser_id },
      select: {
        id: true,
        display_name: true,
        is_verified: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });
    if (sessionUser) {
      finalUserForSession = {
        id: sessionUser.id,
        displayName: sessionUser.display_name ?? null,
        isVerified: sessionUser.is_verified,
        status: sessionUser.status ?? undefined,
        createdAt: toISOStringSafe(sessionUser.created_at),
        updatedAt: toISOStringSafe(sessionUser.updated_at),
      };
    }
  }

  if (!finalUserForSession && userSessionRow) {
    finalUserForSession = typia.random<ITodoAppTodoUser.ISummary>();
  }

  const userSessionSummary = userSessionRow
    ? {
        id: userSessionRow.id,
        user: finalUserForSession!,
        ip: userSessionRow.ip,
        href: userSessionRow.href ?? undefined,
        referrer: userSessionRow.referrer ?? null,
        createdAt: toISOStringSafe(userSessionRow.created_at),
        expiredAt: userSessionRow.expired_at
          ? toISOStringSafe(userSessionRow.expired_at)
          : null,
      }
    : undefined;

  let listSummary: ITodoAppList.ISummary | undefined = undefined;
  if (listRow) {
    const ownerRow = await MyGlobal.prisma.todo_app_todouser.findUnique({
      where: { id: listRow.todo_app_todouser_id },
      select: {
        id: true,
        display_name: true,
        is_verified: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

    const ownerSummary = ownerRow
      ? {
          id: ownerRow.id,
          displayName: ownerRow.display_name ?? null,
          isVerified: ownerRow.is_verified,
          status: ownerRow.status ?? undefined,
          createdAt: toISOStringSafe(ownerRow.created_at),
          updatedAt: toISOStringSafe(ownerRow.updated_at),
        }
      : typia.random<ITodoAppTodoUser.ISummary>();

    listSummary = {
      id: listRow.id,
      title: listRow.title,
      visibility: listRow.visibility,
      owner: ownerSummary,
      description: listRow.description ?? null,
      createdAt: toISOStringSafe(listRow.created_at),
      updatedAt: toISOStringSafe(listRow.updated_at),
      deletedAt: listRow.deleted_at
        ? toISOStringSafe(listRow.deleted_at)
        : null,
    };
  }

  const taskSummary = taskRow
    ? {
        id: taskRow.id,
        title: taskRow.title,
        isCompleted: taskRow.is_completed,
        dueDate: taskRow.due_date ? toISOStringSafe(taskRow.due_date) : null,
        createdAt: toISOStringSafe(taskRow.created_at),
        updatedAt: toISOStringSafe(taskRow.updated_at),
        list: listSummary ?? typia.random<ITodoAppList.ISummary>(),
      }
    : undefined;

  const result: ITodoAppUserActivityLog = {
    id: activity.id,
    admin: undefined,
    adminSession: undefined,
    user: userSummary ?? undefined,
    userSession: userSessionSummary ?? undefined,
    list: listSummary ?? undefined,
    task: taskSummary ?? undefined,
    eventType: activity.activity_type ?? "",
    targetType: null,
    targetId: null,
    details: activity.details ?? null,
    ip: activity.ip ?? null,
    href: activity.href ?? null,
    userAgent: null,
    createdAt: toISOStringSafe(activity.created_at),
    updatedAt: activity.updated_at
      ? toISOStringSafe(activity.updated_at)
      : null,
    deletedAt: activity.deleted_at
      ? toISOStringSafe(activity.deleted_at)
      : null,
  };

  return result;
}
