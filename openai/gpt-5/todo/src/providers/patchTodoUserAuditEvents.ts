import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAuditEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAuditEvent";
import { IETodoAuditEventOrderBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoAuditEventOrderBy";
import { IESortDirection } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortDirection";
import { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import { IPageITodoAuditEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAuditEvent";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";
import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoUserAuditEvents(props: {
  user: UserPayload;
  body: ITodoAuditEvent.IRequest;
}): Promise<IPageITodoAuditEvent.ISummary> {
  const { user, body } = props;

  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  const sortBy: IETodoAuditEventOrderBy =
    body.sort_by ?? body.order_by ?? "created_at";
  const order: IESortOrder | IESortDirection =
    body.order ?? body.order_direction ?? "desc";

  const [sessions, todos] = await Promise.all([
    MyGlobal.prisma.todo_user_sessions.findMany({
      where: { todo_user_id: user.id },
      select: { id: true },
    }),
    MyGlobal.prisma.todo_todos.findMany({
      where: { todo_user_id: user.id },
      select: { id: true },
    }),
  ]);

  const sessionIds = sessions.map((s) => s.id);
  const todoIds = todos.map((t) => t.id);

  const buildWhere = () => ({
    OR: [
      { todo_user_id: user.id },
      ...(sessionIds.length > 0
        ? [{ todo_user_session_id: { in: sessionIds } }]
        : []),
      ...(todoIds.length > 0 ? [{ todo_todo_id: { in: todoIds } }] : []),
    ],
    ...(!body.include_redacted ? { deleted_at: null } : {}),
    ...(body.created_at?.from !== undefined || body.created_at?.to !== undefined
      ? {
          created_at: {
            ...(body.created_at?.from !== undefined && {
              gte: body.created_at!.from,
            }),
            ...(body.created_at?.to !== undefined && {
              lte: body.created_at!.to,
            }),
          },
        }
      : {}),
    ...(body.categories !== undefined && body.categories.length > 0
      ? { category: { in: body.categories } }
      : {}),
    ...(body.actions !== undefined && body.actions.length > 0
      ? { action: { in: body.actions } }
      : {}),
    ...(body.success !== undefined ? { success: body.success } : {}),
    ...(body.actor_type !== undefined ? { actor_type: body.actor_type } : {}),
    ...(body.resource_type !== undefined
      ? { resource_type: body.resource_type }
      : {}),
    ...(body.resource_id !== undefined
      ? { resource_id: body.resource_id }
      : {}),
    ...(body.todo_todo_id !== undefined
      ? { todo_todo_id: body.todo_todo_id }
      : {}),
    ...(body.todo_user_session_id !== undefined
      ? { todo_user_session_id: body.todo_user_session_id }
      : {}),
  });

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_audit_events.findMany({
      where: buildWhere(),
      orderBy: [
        sortBy === "updated_at" ? { updated_at: order } : { created_at: order },
        { updated_at: order },
      ],
      skip,
      take: limit,
      include: {
        user: true,
        userSession: { include: { user: true } },
        todo: { include: { user: true } },
      },
    }),
    MyGlobal.prisma.todo_audit_events.count({ where: buildWhere() }),
  ]);

  const toUserSummary = (u: {
    id: string;
    email: string;
    created_at: unknown;
    updated_at: unknown;
  }) => ({
    id: u.id as string & tags.Format<"uuid">,
    email: u.email as string & tags.Format<"email">,
    created_at: toISOStringSafe(u.created_at as any),
    updated_at: toISOStringSafe(u.updated_at as any),
  });

  const data = rows.map((row) => {
    const userSummary = row.user ? toUserSummary(row.user) : null;

    const sessionSummary = row.userSession
      ? {
          id: row.userSession.id as string & tags.Format<"uuid">,
          ip: row.userSession.ip as
            | (string & tags.Format<"ipv4">)
            | (string & tags.Format<"ipv6">),
          href: row.userSession.href as string &
            tags.MaxLength<80000> &
            tags.Format<"uri">,
          referrer:
            (row.userSession.referrer as string &
              tags.MaxLength<80000> &
              tags.Format<"uri">) || "",
          created_at: toISOStringSafe(row.userSession.created_at as any),
          expired_at: row.userSession.expired_at
            ? toISOStringSafe(row.userSession.expired_at as any)
            : null,
          user: toUserSummary(row.userSession.user),
        }
      : null;

    const todoSummary = row.todo
      ? {
          id: row.todo.id as string & tags.Format<"uuid">,
          title: row.todo.title,
          due_date: row.todo.due_date
            ? toISOStringSafe(row.todo.due_date as any)
            : null,
          completed: row.todo.completed,
          created_at: toISOStringSafe(row.todo.created_at as any),
          updated_at: toISOStringSafe(row.todo.updated_at as any),
          owner: toUserSummary(row.todo.user),
        }
      : null;

    return {
      id: row.id as string & tags.Format<"uuid">,
      actor_type: row.actor_type,
      category: row.category,
      action: row.action,
      success: row.success,
      message: row.message ?? null,
      ip:
        (row.ip as
          | (string & tags.Format<"ipv4">)
          | (string & tags.Format<"ipv6">)) ?? null,
      href:
        (row.href as string & tags.MaxLength<80000> & tags.Format<"uri">) ??
        null,
      referrer:
        (row.referrer as string & tags.MaxLength<80000> & tags.Format<"uri">) ??
        null,
      resource_type: row.resource_type ?? null,
      resource_id: row.resource_id
        ? (row.resource_id as string & tags.Format<"uuid">)
        : null,
      created_at: toISOStringSafe(row.created_at as any),
      updated_at: toISOStringSafe(row.updated_at as any),
      user: userSummary,
      userSession: sessionSummary,
      todo: todoSummary,
    } as ITodoAuditEvent.ISummary;
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
