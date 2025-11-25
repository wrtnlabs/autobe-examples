import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserUsersUserIdSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoListUserSession> {
  if (!props.userId || !props.sessionId) {
    throw new HttpException("Both userId and sessionId are required", 400);
  }

  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: props.sessionId,
      user_id: props.userId,
    },
  });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  return session.id as ITodoListUserSession;
}
