import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoUserSessionsSessionId(props: {
  user: UserPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoUserSession> {
  const record = await MyGlobal.prisma.multi_user_todo_user_sessions.findUnique(
    {
      where: { id: props.sessionId },
      select: {
        id: true,
        multi_user_todo_user_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        expired_at: true,
      },
    },
  );
  if (record === null || record.deleted_at !== null) {
    throw new HttpException("Session not found", 404);
  }
  return {
    id: record.id,
    multi_user_todo_user_id: record.multi_user_todo_user_id,
    ip: record.ip,
    href: record.href,
    referrer: record.referrer,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at !== null ? toISOStringSafe(record.deleted_at) : null,
    expired_at: toISOStringSafe(record.expired_at),
  };
}
