import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppActorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppActorSession";
import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function getTodoAppTodoAdminActorsSessionsSessionId(props: {
  todoAdmin: TodoadminPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppActorSession> {
  // Read-only lookup of a session across admin, user, and guest session tables.
  // Auth has already been enforced by the controller via TodoadminAuth.

  // 1. Try to find an admin session with this ID.
  const adminSession =
    await MyGlobal.prisma.todo_app_todoadmin_sessions.findUnique({
      where: { id: props.sessionId },
      include: {
        todoAdmin: true,
      },
    });

  if (adminSession !== null) {
    return {
      id: adminSession.id,
      actorType: "admin",
      actorId: adminSession.todoAdmin.id,
      ip: adminSession.ip,
      href: adminSession.href,
      referrer: adminSession.referrer,
      createdAt: toISOStringSafe(adminSession.created_at),
      expiredAt:
        adminSession.expired_at === null
          ? null
          : toISOStringSafe(adminSession.expired_at),
    };
  }

  // 2. Try to find a registered todo user session.
  const userSession =
    await MyGlobal.prisma.todo_app_todouser_sessions.findUnique({
      where: { id: props.sessionId },
      include: {
        todoUser: true,
      },
    });

  if (userSession !== null) {
    return {
      id: userSession.id,
      actorType: "user",
      actorId: userSession.todoUser.id,
      ip: userSession.ip,
      href: userSession.href,
      referrer: userSession.referrer,
      createdAt: toISOStringSafe(userSession.created_at),
      expiredAt:
        userSession.expired_at === null
          ? null
          : toISOStringSafe(userSession.expired_at),
    };
  }

  // 3. Finally, try to find a guest user session.
  const guestSession =
    await MyGlobal.prisma.todo_app_guestuser_sessions.findUnique({
      where: { id: props.sessionId },
      // Use the correct include property name as suggested by the compiler,
      // so that the relation is properly resolved when needed.
      include: {
        guestUser: true,
      },
    });

  if (guestSession !== null) {
    return {
      id: guestSession.id,
      actorType: "guest",
      // The session row exposes the owning guest user's id via its foreign key
      // `todo_app_guestuser_id`, so use that as the actor identifier instead
      // of a non-existent nested `guestuser` relation.
      actorId: guestSession.todo_app_guestuser_id,
      ip: guestSession.ip,
      href: guestSession.href,
      referrer: guestSession.referrer,
      createdAt: toISOStringSafe(guestSession.created_at),
      expiredAt:
        guestSession.expired_at === null
          ? null
          : toISOStringSafe(guestSession.expired_at),
    };
  }

  // 4. No session found in any table.
  throw new HttpException("Session not found", 404);
}
