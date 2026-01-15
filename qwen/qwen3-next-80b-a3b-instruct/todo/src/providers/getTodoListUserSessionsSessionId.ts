import { ArrayUtil } from "@nestia/e2e";
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
import { TodoListUserSessionTransformer } from "../transformers/TodoListUserSessionTransformer";

export async function getTodoListUserSessionsSessionId(props: {
  user: UserPayload;
  sessionId: string;
}): Promise<ITodoListUserSession> {
  const session = await MyGlobal.prisma.todo_list_user_sessions.findUnique({
    where: {
      id: props.sessionId,
      todo_list_user_id: props.user.id,
    },
    ...TodoListUserSessionTransformer.select(),
  });
  if (!session) {
    throw new HttpException("Session not found or access denied", 404);
  }
  return await TodoListUserSessionTransformer.transform(session);
}
