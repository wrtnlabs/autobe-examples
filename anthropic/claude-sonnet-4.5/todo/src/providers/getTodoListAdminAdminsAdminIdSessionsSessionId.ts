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
  const record = await MyGlobal.prisma.todo_list_admin_sessions.findFirst({
    where: {
      id: props.sessionId,
      todo_list_admin_id: props.adminId,
    },
    include: {
      admin: true,
    },
  });

  if (!record || !record.admin) {
    throw new HttpException("Admin session not found", 404);
  }

  return {
    id: record.id,
    admin: {
      id: record.admin.id,
      email: record.admin.email,
      disabled_at: record.admin.disabled_at
        ? toISOStringSafe(record.admin.disabled_at)
        : undefined,
    },
    ip: record.ip,
    href: record.href,
    referrer: record.referrer,
    created_at: toISOStringSafe(record.created_at),
    expired_at: record.expired_at
      ? toISOStringSafe(record.expired_at)
      : undefined,
  };
}
