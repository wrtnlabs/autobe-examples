import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function deleteTodoAppTodoUserTodoUsersTodoUserIdSessionsSessionId(props: {
  todoUser: TodouserPayload;
  todoUserId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { todoUser, todoUserId, sessionId } = props;

  // Authorization: caller must match path user
  if (todoUser.id !== todoUserId) {
    throw new HttpException(
      "Unauthorized: caller does not match path user",
      403,
    );
  }

  // Verify session exists and belongs to the caller
  const session = await MyGlobal.prisma.todo_app_todouser_sessions.findUnique({
    where: { id: sessionId },
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

  if (session === null) {
    throw new HttpException("Not Found", 404);
  }

  if (session.todo_app_todouser_id !== todoUser.id) {
    throw new HttpException(
      "Unauthorized: You can only revoke your own sessions",
      403,
    );
  }

  // Hard delete session (model has no soft-delete field)
  await MyGlobal.prisma.todo_app_todouser_sessions.delete({
    where: { id: sessionId },
  });

  // Best-effort cache/token invalidation; do not block on failures
  try {
    // Optional session manager or token cache helpers on MyGlobal
    // Use optional chaining to avoid runtime errors when helpers are absent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalAny = MyGlobal as any;
    if (globalAny.sessionManager?.invalidate)
      await globalAny.sessionManager.invalidate(sessionId);
    if (globalAny.tokenCache?.revoke)
      await globalAny.tokenCache.revoke(sessionId);
  } catch {
    // Swallow errors from external stores to avoid failing the HTTP operation
  }

  // Audit the revocation for traceability
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.todo_app_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_todouser_id: todoUser.id,
      todo_app_todouser_session_id: sessionId,
      event_type: "session_revoked",
      target_type: "session",
      target_id: sessionId,
      details: `Session revoked by user ${todoUser.id}`,
      ip: session.ip ?? null,
      href: session.href ?? null,
      user_agent: null,
      created_at: now,
      updated_at: now,
    },
  });
}
