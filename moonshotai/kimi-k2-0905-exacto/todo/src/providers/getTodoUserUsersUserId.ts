import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ITodoUser> {
  const { userId } = props;

  // Fetch user with task count
  const [user, tasksCount] = await Promise.all([
    MyGlobal.prisma.todo_users.findFirst({
      where: {
        id: userId,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.todo_tasks.count({
      where: {
        todo_user_id: userId,
      },
    }),
  ]);

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    mfa_enabled: user.mfa_enabled,
    failed_login_attempts: user.failed_login_attempts,
    locked_until: user.locked_until ? toISOStringSafe(user.locked_until) : null,
    tasks_count: tasksCount,
  };
}
