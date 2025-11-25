import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function getTodoListUsersEmailSessionsSessionId(props: {
  email: string;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoListUserSession> {
  // Step 1: Find user by email
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { email: props.email },
    select: { id: true },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Step 2: Find session belonging to user by sessionId
  const session = await MyGlobal.prisma.todo_list_user_sessions.findUnique({
    where: { id: props.sessionId },
    select: {
      id: true,
      todo_list_user_id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      expired_at: true,
    },
  });
  if (!session || session.todo_list_user_id !== user.id) {
    throw new HttpException("Session not found for user", 404);
  }

  // Step 3: Build the result DTO
  return {
    id: session.id,
    user: { id: user.id },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at !== null ? toISOStringSafe(session.expired_at) : null,
  };
}
