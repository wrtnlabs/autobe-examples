import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUserActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserActivityLog";
import { IPageITodoAppUserActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserActivityLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";
import { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminActivityLogs(props: {
  admin: AdminPayload;
  body: ITodoAppUserActivityLog.IRequest;
}): Promise<IPageITodoAppUserActivityLog.ISummary> {
  const { admin, body } = props;

  if (!admin || admin.type !== "admin")
    throw new HttpException("Unauthorized", 403);

  const page = Number(body.page ?? 1);
  const pageSize = Math.min(Number(body.pageSize ?? 25), 100);
  if (page <= 0 || pageSize <= 0)
    throw new HttpException(
      "Bad Request: page and pageSize must be positive integers",
      400,
    );

  const order = (body.order === "asc" ? "asc" : "desc") as "asc" | "desc";
  const orderBy =
    body.sortBy === "eventType"
      ? { activity_type: order }
      : { created_at: order };

  const buildWhere = () =>
    ({
      ...(body.eventType !== undefined && { activity_type: body.eventType }),
      ...(body.actorId !== undefined &&
        body.actorId !== null && { todo_app_todouser_id: body.actorId }),
      ...(body.sessionId !== undefined &&
        body.sessionId !== null && {
          todo_app_todouser_session_id: body.sessionId,
        }),
      ...(body.listId !== undefined &&
        body.listId !== null && { todo_app_list_id: body.listId }),
      ...(body.taskId !== undefined &&
        body.taskId !== null && { todo_app_task_id: body.taskId }),
      ...((body.createdAtFrom !== undefined && body.createdAtFrom !== null) ||
      (body.createdAtTo !== undefined && body.createdAtTo !== null)
        ? {
            created_at: {
              ...(body.createdAtFrom !== undefined &&
                body.createdAtFrom !== null && { gte: body.createdAtFrom }),
              ...(body.createdAtTo !== undefined &&
                body.createdAtTo !== null && { lte: body.createdAtTo }),
            },
          }
        : {}),
      ...(body.includeSoftDeleted ? {} : { deleted_at: null }),
    }) as Record<string, unknown>;

  try {
    const whereCondition = buildWhere();

    const [rows, total] = await Promise.all([
      MyGlobal.prisma.todo_app_user_activity_logs.findMany({
        where: whereCondition,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          activity_type: true,
          details: true,
          ip: true,
          href: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          todo_app_todouser_id: true,
          todo_app_todouser_session_id: true,
          todo_app_list_id: true,
          todo_app_task_id: true,
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
          userSession: {
            select: {
              id: true,
              ip: true,
              href: true,
              referrer: true,
              created_at: true,
              expired_at: true,
              todouser: {
                select: {
                  id: true,
                  display_name: true,
                  is_verified: true,
                  status: true,
                  created_at: true,
                  updated_at: true,
                },
              },
            },
          },
          list: {
            select: {
              id: true,
              title: true,
              visibility: true,
              description: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              owner: {
                select: {
                  id: true,
                  display_name: true,
                  is_verified: true,
                  status: true,
                  created_at: true,
                  updated_at: true,
                },
              },
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
              list: {
                select: {
                  id: true,
                  title: true,
                  visibility: true,
                  description: true,
                  created_at: true,
                  updated_at: true,
                  owner: {
                    select: {
                      id: true,
                      display_name: true,
                      is_verified: true,
                      status: true,
                      created_at: true,
                      updated_at: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),

      MyGlobal.prisma.todo_app_user_activity_logs.count({
        where: whereCondition,
      }),
    ]);

    await MyGlobal.prisma.todo_app_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_app_admin_id: admin.id,
        event_type: "activity_logs_index",
        target_type: "activity_logs",
        details: JSON.stringify({ filters: body }),
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });

    const mapUser = (u: any): ITodoAppTodoUser.ISummary => ({
      id: u.id as string & tags.Format<"uuid">,
      displayName: u.display_name ?? null,
      isVerified: u.is_verified,
      status: u.status ?? undefined,
      createdAt: toISOStringSafe(u.created_at),
      updatedAt: toISOStringSafe(u.updated_at),
    });

    const mapList = (l: any): ITodoAppList.ISummary => {
      const owner = l.owner
        ? mapUser(l.owner)
        : ({
            id: v4() as string & tags.Format<"uuid">,
            displayName: null,
            isVerified: false,
            status: "",
            createdAt: toISOStringSafe(new Date()),
            updatedAt: toISOStringSafe(new Date()),
          } as ITodoAppTodoUser.ISummary);

      return {
        id: l.id as string & tags.Format<"uuid">,
        title: l.title,
        visibility: l.visibility,
        owner,
        description: l.description ?? null,
        createdAt: toISOStringSafe(l.created_at),
        updatedAt: toISOStringSafe(l.updated_at),
        deletedAt: l.deleted_at ? toISOStringSafe(l.deleted_at) : null,
      } satisfies ITodoAppList.ISummary;
    };

    const mapTask = (t: any): ITodoAppTask.ISummary => {
      const listSummary = t.list
        ? mapList(t.list)
        : mapList({
            id: v4() as string & tags.Format<"uuid">,
            title: "",
            visibility: "",
            description: null,
            created_at: t.created_at,
            updated_at: t.updated_at,
            owner: {
              id: v4() as string & tags.Format<"uuid">,
              display_name: null,
              is_verified: false,
              status: "",
              created_at: t.created_at,
              updated_at: t.updated_at,
            },
          });

      return {
        id: t.id as string & tags.Format<"uuid">,
        title: t.title,
        isCompleted: t.is_completed,
        dueDate: t.due_date ? toISOStringSafe(t.due_date) : null,
        createdAt: toISOStringSafe(t.created_at),
        updatedAt: toISOStringSafe(t.updated_at),
        list: listSummary,
      } satisfies ITodoAppTask.ISummary;
    };

    const data = rows.map((r: any) => {
      const user = r.user ? mapUser(r.user) : null;
      const userSession = r.userSession
        ? {
            id: r.userSession.id as string & tags.Format<"uuid">,
            user: r.userSession.todouser
              ? mapUser(r.userSession.todouser)
              : mapUser({
                  id: v4(),
                  display_name: null,
                  is_verified: false,
                  status: "",
                  created_at: r.userSession.created_at,
                  updated_at: r.userSession.created_at,
                }),
            ip: r.userSession.ip,
            href: r.userSession.href ?? undefined,
            referrer: r.userSession.referrer ?? null,
            createdAt: toISOStringSafe(r.userSession.created_at),
            expiredAt: r.userSession.expired_at
              ? toISOStringSafe(r.userSession.expired_at)
              : null,
          }
        : null;

      const list = r.list ? mapList(r.list) : null;
      const task = r.task ? mapTask(r.task) : null;

      const summary: ITodoAppUserActivityLog.ISummary = {
        id: r.id as string & tags.Format<"uuid">,
        activityType: r.activity_type,
        details: r.details ?? null,
        ip: r.ip ?? null,
        href: r.href ?? null,
        user,
        userSession,
        list,
        task,
        createdAt: toISOStringSafe(r.created_at),
        updatedAt: r.updated_at ? toISOStringSafe(r.updated_at) : null,
      };

      return summary;
    });

    return {
      pagination: {
        current: Number(page),
        limit: Number(pageSize),
        records: total,
        pages: Math.ceil(total / pageSize),
      },
      data,
    };
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }
}
