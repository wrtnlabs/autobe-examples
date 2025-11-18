import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postTodoListAdminTodoListAdminsTodoListAdminIdTodoListAdminSessions(props: {
  admin: AdminPayload;
  todoListAdminId: string & tags.Format<"uuid">;
  body: ITodoListAdminSession.ICreate;
}): Promise<ITodoListAdminSession> {
  const now = toISOStringSafe(new Date());
  const id = v4();

  const created = await MyGlobal.prisma.todo_list_admin_sessions.create({
    data: {
      id,
      todo_list_admin_id: props.todoListAdminId,
      ip: props.body.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: props.body.expired_at ?? null,
    },
  });

  return {
    id: created.id,
    todoListAdminId: created.todo_list_admin_id,
    ip: created.ip,
    href: created.href,
    referrer: created.referrer,
    created_at: toISOStringSafe(created.created_at),
    expired_at:
      created.expired_at === null ? null : toISOStringSafe(created.expired_at),
  };
}
