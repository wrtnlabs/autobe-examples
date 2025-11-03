import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAuditEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAuditEvent";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";
import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoUserAuditEventsAuditEventId(props: {
  user: UserPayload;
  auditEventId: string & tags.Format<"uuid">;
}): Promise<ITodoAuditEvent> {
  const { user, auditEventId } = props;

  const row = await MyGlobal.prisma.todo_audit_events.findFirst({
    where: {
      id: auditEventId,
      deleted_at: null,
    },
    select: {
      id: true,
      actor_type: true,
      category: true,
      action: true,
      success: true,
      message: true,
      ip: true,
      href: true,
      referrer: true,
      resource_type: true,
      resource_id: true,
      todo_user_id: true,
      todo_user_session_id: true,
      todo_todo_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      user: {
        select: {
          id: true,
          email: true,
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
          todo_user_id: true,
          user: {
            select: {
              id: true,
              email: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      },
      todo: {
        select: {
          id: true,
          title: true,
          due_date: true,
          completed: true,
          created_at: true,
          updated_at: true,
          todo_user_id: true,
          user: {
            select: {
              id: true,
              email: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      },
    },
  });

  if (row === null) {
    throw new HttpException("Not Found", 404);
  }

  const ownsByUserId =
    row.todo_user_id !== null && row.todo_user_id === user.id;
  const ownsBySession = row.userSession
    ? row.userSession.todo_user_id === user.id
    : false;
  const ownsByTodo = row.todo ? row.todo.todo_user_id === user.id : false;

  if (!ownsByUserId && !ownsBySession && !ownsByTodo) {
    throw new HttpException("Not Found", 404);
  }

  return {
    id: row.id as string & tags.Format<"uuid">,
    actor_type: row.actor_type,
    category: row.category,
    action: row.action,
    success: row.success,
    message: row.message ?? null,
    ip: row.ip ?? null,
    href: row.href
      ? (row.href as string & tags.MaxLength<80000> & tags.Format<"uri">)
      : null,
    referrer: row.referrer
      ? (row.referrer as string & tags.MaxLength<80000> & tags.Format<"uri">)
      : null,
    resource_type: row.resource_type ?? null,
    resource_id: row.resource_id
      ? (row.resource_id as string & tags.Format<"uuid">)
      : null,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    user: row.user
      ? {
          id: row.user.id as string & tags.Format<"uuid">,
          email: row.user.email as string & tags.Format<"email">,
          created_at: toISOStringSafe(row.user.created_at),
          updated_at: toISOStringSafe(row.user.updated_at),
        }
      : null,
    userSession: row.userSession
      ? {
          id: row.userSession.id as string & tags.Format<"uuid">,
          ip: row.userSession.ip as
            | (string & tags.Format<"ipv4">)
            | (string & tags.Format<"ipv6">),
          href: row.userSession.href as string &
            tags.MaxLength<80000> &
            tags.Format<"uri">,
          referrer:
            row.userSession.referrer === ""
              ? ""
              : (row.userSession.referrer as string &
                  tags.MaxLength<80000> &
                  tags.Format<"uri">),
          created_at: toISOStringSafe(row.userSession.created_at),
          expired_at: row.userSession.expired_at
            ? toISOStringSafe(row.userSession.expired_at)
            : null,
          user: {
            id: row.userSession.user.id as string & tags.Format<"uuid">,
            email: row.userSession.user.email as string & tags.Format<"email">,
            created_at: toISOStringSafe(row.userSession.user.created_at),
            updated_at: toISOStringSafe(row.userSession.user.updated_at),
          },
        }
      : null,
    todo: row.todo
      ? {
          id: row.todo.id as string & tags.Format<"uuid">,
          title: row.todo.title,
          due_date: row.todo.due_date
            ? toISOStringSafe(row.todo.due_date)
            : null,
          completed: row.todo.completed,
          created_at: toISOStringSafe(row.todo.created_at),
          updated_at: toISOStringSafe(row.todo.updated_at),
          owner: {
            id: row.todo.user.id as string & tags.Format<"uuid">,
            email: row.todo.user.email as string & tags.Format<"email">,
            created_at: toISOStringSafe(row.todo.user.created_at),
            updated_at: toISOStringSafe(row.todo.user.updated_at),
          },
        }
      : null,
  };
}
