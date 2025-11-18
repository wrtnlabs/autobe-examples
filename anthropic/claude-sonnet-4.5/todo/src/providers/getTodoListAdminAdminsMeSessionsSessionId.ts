import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoListAdminAdminsMeSessionsSessionId(props: {
  admin: AdminPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoListAdminSession> {
  const session = await MyGlobal.prisma.todo_list_admin_sessions.findUnique({
    where: {
      id: props.sessionId,
    },
  });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.todo_list_admin_id !== props.admin.id) {
    throw new HttpException("Forbidden", 403);
  }

  return {
    id: session.id,
    todo_list_admin_id: session.todo_list_admin_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
