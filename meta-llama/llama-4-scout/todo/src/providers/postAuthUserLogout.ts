import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserLogout(props: {
  user: UserPayload;
}): Promise<ITodoListUser.ILogoutResult> {
  const now = toISOStringSafe(new Date());

  try {
    // Update all unexpired sessions for this user: mark as expired
    await MyGlobal.prisma.todo_list_user_sessions.updateMany({
      where: {
        todo_list_user_id: props.user.id,
        expired_at: null,
      },
      data: {
        expired_at: now,
      },
    });
    return { success: true };
  } catch (err) {
    // If the database update fails, return logged-out failure
    return { success: false };
  }
}
