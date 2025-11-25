import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putTodoListAdminTodoListAdminsTodoListAdminIdTodoListAdminSessionsId(props: {
  admin: AdminPayload;
  todoListAdminId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
  body: ITodoListAdminSession.IUpdate;
}): Promise<ITodoListAdminSession> {
  const existing = await MyGlobal.prisma.todo_list_admin_sessions.findUnique({
    where: {
      id: props.id,
    },
  });

  if (
    existing === null ||
    existing.todo_list_admin_id !== props.todoListAdminId
  ) {
    throw new HttpException("Admin session not found", 404);
  }

  const updated = await MyGlobal.prisma.todo_list_admin_sessions.update({
    where: { id: props.id },
    data: {
      ip: props.body.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      expired_at:
        props.body.expired_at !== undefined
          ? props.body.expired_at
          : existing.expired_at !== null
            ? toISOStringSafe(existing.expired_at)
            : null,
    },
  });

  return {
    id: updated.id,
    todoListAdminId: updated.todo_list_admin_id,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expired_at:
      updated.expired_at !== null && updated.expired_at !== undefined
        ? toISOStringSafe(updated.expired_at)
        : null,
  };
}
