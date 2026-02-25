import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppUserSessionTransformer } from "../transformers/TodoAppUserSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppSessionsSessionId(props: {
  sessionId: string;
}): Promise<ITodoAppUserSession> {
  const session = await MyGlobal.prisma.todo_app_user_sessions.findFirstOrThrow(
    {
      where: {
        id: props.sessionId,
        todo_app_user_id: "JWT_AUTHENTICATED_USER_ID",
      },
      ...TodoAppUserSessionTransformer.select(),
    },
  );
  return await TodoAppUserSessionTransformer.transform(session);
}
