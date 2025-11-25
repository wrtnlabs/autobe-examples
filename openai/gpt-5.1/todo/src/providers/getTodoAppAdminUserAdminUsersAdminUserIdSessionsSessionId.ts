import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdminUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUserSession";
import { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function getTodoAppAdminUserAdminUsersAdminUserIdSessionsSessionId(props: {
  adminUser: AdminuserPayload;
  adminUserId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppAdminUserSession> {
  const session = await MyGlobal.prisma.todo_app_adminuser_sessions.findFirst({
    where: {
      id: props.sessionId,
      todo_app_adminuser_id: props.adminUserId,
    },
    include: {
      adminUser: true,
    },
  });

  if (session === null) {
    throw new HttpException("Admin user session not found", 404);
  }

  const adminUserSummary: ITodoAppAdminUser.ISummary = {
    id: session.adminUser.id,
    email: session.adminUser.email,
    display_name:
      session.adminUser.display_name === null
        ? null
        : session.adminUser.display_name,
    status: session.adminUser.status,
    created_at: toISOStringSafe(session.adminUser.created_at),
    updated_at: toISOStringSafe(session.adminUser.updated_at),
  };

  const result: ITodoAppAdminUserSession = {
    id: session.id,
    adminUser: adminUserSummary,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at === null ? null : toISOStringSafe(session.expired_at),
  };

  return result;
}
