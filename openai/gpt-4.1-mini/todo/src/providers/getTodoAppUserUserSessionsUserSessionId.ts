import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppUserSessionTransformer } from "../transformers/TodoAppUserSessionTransformer";

export async function getTodoAppUserUserSessionsUserSessionId(props: {
  user: UserPayload;
  userSessionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUserSession> {
  const session = await MyGlobal.prisma.todo_app_user_sessions.findFirst({
    where: {
      id: props.userSessionId,
      todo_app_user_id: props.user.id,
    },
    ...TodoAppUserSessionTransformer.select(),
  });
  if (!session) throw new HttpException("User session not found", 404);
  return await TodoAppUserSessionTransformer.transform(session);
}
