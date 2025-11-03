import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdminAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminAuth";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postTodoListAdminAdminsLogoutAll(props: {
  admin: AdminPayload;
}): Promise<ITodoListAdminAuth.ILogoutAllResponse> {
  const { admin } = props;

  const now = toISOStringSafe(new Date());

  const result = await MyGlobal.prisma.todo_list_admin_sessions.updateMany({
    where: {
      todo_list_admin_id: admin.id,
      expired_at: null,
    },
    data: {
      expired_at: now,
    },
  });

  return {
    success: true,
    message:
      "All active sessions have been successfully terminated. You must log in again on all devices to regain access.",
    sessions_terminated: result.count,
  };
}
