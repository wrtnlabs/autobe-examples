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

export async function postTodoListAdminAdminsLogout(props: {
  admin: AdminPayload;
}): Promise<ITodoListAdminAuth.ILogoutResponse> {
  const { admin } = props;

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.todo_list_admin_sessions.update({
    where: { id: admin.session_id },
    data: { expired_at: now },
  });

  return {
    success: true,
    message: "Successfully logged out. Your session has been terminated.",
  };
}
