import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { IMultiUserTodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { MultiUserTodoUserSessionTransformer } from "../transformers/MultiUserTodoUserSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoUserSessionsSessionId(props: {
  user: UserPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoUserSession> {
  const record =
    await MyGlobal.prisma.multi_user_todo_user_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        expired_at: true,
        multi_user_todo_user_id: true,
        user: MultiUserTodoUserSessionTransformer.select().select.user,
      },
    });
  if (
    record.multi_user_todo_user_id !== props.user.id ||
    record.deleted_at !== null
  ) {
    throw new HttpException("Forbidden", 403);
  }
  return await MultiUserTodoUserSessionTransformer.transform(record);
}
