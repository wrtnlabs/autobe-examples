import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminuserSession";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function getTodoAppAdminUserAdminUsersAdminUserIdSessionsSessionId(props: {
  adminUser: AdminuserPayload;
  adminUserId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppAdminuserSession> {
  // Ensure the target admin user exists and is active/non-deleted.
  const targetAdminUser = await MyGlobal.prisma.todo_app_adminusers.findFirst({
    where: {
      id: props.adminUserId,
      deleted_at: null,
      status: "active",
    },
  });

  if (targetAdminUser === null) {
    throw new HttpException("Admin user not found", 404);
  }

  // Fetch the session ensuring it belongs to the specified admin user.
  const session = await MyGlobal.prisma.todo_app_adminuser_sessions.findFirst({
    where: {
      id: props.sessionId,
      todo_app_adminuser_id: props.adminUserId,
    },
  });

  if (session === null) {
    throw new HttpException("Admin user session not found", 404);
  }

  const createdAtIso = toISOStringSafe(session.created_at);

  const expiredAtIso =
    session.expired_at === null ? null : toISOStringSafe(session.expired_at);

  return {
    id: session.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: createdAtIso,
    expired_at: expiredAtIso,
  };
}
