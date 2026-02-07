import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppUserSessionTransformer } from "../transformers/TodoAppUserSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUserSessionsSessionId(props: {
  user: UserPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUserSession> {
  // Find the session by ID and ensure it belongs to the authenticated user
  const session = await MyGlobal.prisma.todo_app_user_sessions.findUnique({
    where: {
      id: props.sessionId,
      todo_app_user_id: props.user.id,
    },
    ...TodoAppUserSessionTransformer.select(),
  });
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  // Check if session has expired using string comparison
  const now = toISOStringSafe(new Date());
  if (new Date(session.expired_at) < new Date(now)) {
    throw new HttpException("Session expired", 410);
  }
  return await TodoAppUserSessionTransformer.transform(session);
}
