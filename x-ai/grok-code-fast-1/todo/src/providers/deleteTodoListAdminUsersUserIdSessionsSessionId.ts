import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoListAdminUsersUserIdSessionsSessionId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoListUserSession> {
  const session = await MyGlobal.prisma.todo_list_user_sessions.findUnique({
    where: { id: props.sessionId },
  });
  if (!session || session.todo_list_user_id !== props.userId) {
    throw new HttpException("Session not found", 404);
  }
  // Perform deletion, capturing the deleted record for response
  const deleted = await MyGlobal.prisma.todo_list_user_sessions.delete({
    where: { id: props.sessionId },
  });
  return {
    id: deleted.id,
    todo_list_user_id: deleted.todo_list_user_id,
    ip: deleted.ip,
    href: deleted.href,
    referrer: deleted.referrer,
    created_at: toISOStringSafe(deleted.created_at),
    expired_at:
      typeof deleted.expired_at === "undefined" || deleted.expired_at === null
        ? undefined
        : toISOStringSafe(deleted.expired_at),
  };
}
