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

export async function deleteTodoListAdminAdminsAdminIdSessionsSessionId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoListAdminSession> {
  const session = await MyGlobal.prisma.todo_list_admin_sessions.findUnique({
    where: { id: props.sessionId },
  });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.todo_list_admin_id !== props.adminId) {
    throw new HttpException(
      "Session does not belong to the specified administrator",
      403,
    );
  }

  const adminData = await MyGlobal.prisma.todo_list_admins.findUnique({
    where: { id: session.todo_list_admin_id },
  });

  if (!adminData) {
    throw new HttpException("Administrator not found", 404);
  }

  await MyGlobal.prisma.todo_list_admin_sessions.delete({
    where: { id: props.sessionId },
  });

  return {
    id: session.id,
    todo_list_admin_id: session.todo_list_admin_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at === null
        ? undefined
        : toISOStringSafe(session.expired_at),
    admin: {
      id: adminData.id,
      email: adminData.email,
      created_at: toISOStringSafe(adminData.created_at),
      updated_at: toISOStringSafe(adminData.updated_at),
      deleted_at:
        adminData.deleted_at === null
          ? undefined
          : toISOStringSafe(adminData.deleted_at),
    },
  };
}
