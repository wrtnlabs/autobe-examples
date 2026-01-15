import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoUserSessionTransformer } from "../transformers/TodoUserSessionTransformer";

export async function getTodoUserUsersUserIdSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoUserSession> {
  // Verify user owns the session
  if (props.user.id !== props.userId) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch session with transformer's select
  const session = await MyGlobal.prisma.todo_user_sessions.findUnique({
    where: { id: props.sessionId, user_id: props.userId },
    ...TodoUserSessionTransformer.select(),
  });
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  // Transform to response DTO
  return await TodoUserSessionTransformer.transform(session);
}
