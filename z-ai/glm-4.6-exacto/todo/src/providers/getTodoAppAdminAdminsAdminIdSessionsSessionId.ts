import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";
import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminAdminsAdminIdSessionsSessionId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppAdminSession> {
  const session = await MyGlobal.prisma.todo_app_admin_sessions.findUnique({
    where: { id: props.sessionId },
    include: { admin: true },
  });
  if (
    !session ||
    session.admin_id !== props.adminId ||
    !session.admin ||
    session.admin.deleted_at !== null
  ) {
    throw new HttpException("Session not found or access forbidden", 404);
  }
  return {
    id: session.id,
    admin_id: session.admin_id,
    admin: {
      id: session.admin.id,
      email: session.admin.email,
      created_at: toISOStringSafe(session.admin.created_at),
      updated_at: toISOStringSafe(session.admin.updated_at),
    },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    ...(session.expired_at !== null && session.expired_at !== undefined
      ? { expired_at: toISOStringSafe(session.expired_at) }
      : { expired_at: null }),
  };
}
