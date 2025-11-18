import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserUsersMeSessionsSessionId(props: {
  user: UserPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoListUserSession> {
  const record = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: props.sessionId,
      todo_list_user_id: props.user.id,
    },
  });

  if (!record) {
    throw new HttpException("Session not found", 404);
  }

  return {
    id: record.id,
    ip: record.ip,
    href: record.href,
    referrer: record.referrer,
    created_at: toISOStringSafe(record.created_at),
    expired_at:
      record.expired_at === null
        ? undefined
        : toISOStringSafe(record.expired_at),
  };
}
