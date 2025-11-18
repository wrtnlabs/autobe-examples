import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";
import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoListAdminAdminsAdminIdSessionsSessionId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoListAdminSession> {
  const session = await MyGlobal.prisma.todo_list_admin_sessions.findFirst({
    where: {
      id: props.sessionId,
      todo_list_admin_id: props.adminId,
    },
  });
  if (!session) {
    throw new HttpException("Session not found for this admin", 404);
  }

  let adminSummary: ITodoListAdmin.ISummary | undefined = undefined;
  if (session.todo_list_admin_id) {
    const admin = await MyGlobal.prisma.todo_list_admins.findUnique({
      where: { id: session.todo_list_admin_id },
      select: { id: true, email: true, display_name: true },
    });
    if (admin) {
      adminSummary = {
        id: admin.id,
        email: admin.email,
        display_name: admin.display_name,
      };
    }
  }

  return {
    id: session.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at !== null && session.expired_at !== undefined
        ? toISOStringSafe(session.expired_at)
        : undefined,
    admin: adminSummary,
  };
}
