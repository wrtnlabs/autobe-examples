import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoUserSessionTransformer } from "../transformers/TodoUserSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoUserSessionsSessionId(props: {
  user: UserPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoUserSession> {
  const now = toISOStringSafe(new Date());
  const session = await MyGlobal.prisma.todo_user_sessions.findFirst({
    where: {
      id: props.sessionId,
      todo_user_id: props.user.id,
      expired_at: { gt: now },
    },
    ...TodoUserSessionTransformer.select(),
  });
  if (!session) {
    throw new HttpException("Session not found or expired", 404);
  }
  return await TodoUserSessionTransformer.transform(session);
}
