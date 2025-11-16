import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoListAdminUsersUserIdPasswordResetsResetId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  resetId: string & tags.Format<"uuid">;
}): Promise<ITodoListPasswordReset> {
  const passwordReset =
    await MyGlobal.prisma.todo_list_password_resets.findUnique({
      where: {
        id: props.resetId,
      },
    });

  if (!passwordReset) {
    throw new HttpException("Password reset request not found", 404);
  }

  if (passwordReset.todo_list_user_id !== props.userId) {
    throw new HttpException("Password reset request not found", 404);
  }

  return {
    id: passwordReset.id,
    todo_list_user_id: passwordReset.todo_list_user_id,
    token: passwordReset.token,
    used: passwordReset.used,
    created_at: toISOStringSafe(passwordReset.created_at),
    expires_at: toISOStringSafe(passwordReset.expires_at),
  };
}
