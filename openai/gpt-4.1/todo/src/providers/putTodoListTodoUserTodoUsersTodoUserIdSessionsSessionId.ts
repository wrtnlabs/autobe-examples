import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouserSession";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function putTodoListTodoUserTodoUsersTodoUserIdSessionsSessionId(props: {
  todoUser: TodouserPayload;
  todoUserId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
  body: ITodoListTodouserSession.IUpdate;
}): Promise<ITodoListTodouserSession> {
  const { todoUser, todoUserId, sessionId, body } = props;

  // 1. Fetch session, verify owner
  const session = await MyGlobal.prisma.todo_list_todouser_sessions.findUnique({
    where: { id: sessionId },
  });
  if (!session || session.todo_list_todouser_id !== todoUser.id) {
    throw new HttpException("Forbidden: You do not own this session", 403);
  }

  // 2. Build update fields object from body (no immutable fields)
  const updateFields: {
    ip?: string;
    href?: string;
    referrer?: string;
    expired_at?: (string & tags.Format<"date-time">) | null;
    // never set created_at or id
  } = {};
  if (body.ip !== undefined) updateFields.ip = body.ip;
  if (body.href !== undefined) updateFields.href = body.href;
  if (body.referrer !== undefined) updateFields.referrer = body.referrer;
  if (body.expired_at !== undefined)
    updateFields.expired_at = body.expired_at === null ? null : body.expired_at;

  // 3. Perform update
  const updated = await MyGlobal.prisma.todo_list_todouser_sessions.update({
    where: { id: sessionId },
    data: updateFields,
  });

  // 4. Return as ITodoListTodouserSession (convert dates via toISOStringSafe, handle optional expired_at)
  return {
    id: updated.id,
    todo_list_todouser_id: updated.todo_list_todouser_id,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expired_at:
      updated.expired_at !== undefined && updated.expired_at !== null
        ? toISOStringSafe(updated.expired_at)
        : updated.expired_at, // preserves undefined/null as per DTO
  };
}
