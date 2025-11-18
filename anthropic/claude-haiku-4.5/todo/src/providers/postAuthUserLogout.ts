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
}): Promise<ITodoListUser.ILogout> {
  // Try to find the matching session for the current user and session_id
  const now = toISOStringSafe(new Date());
  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: props.user.session_id,
      todo_list_user_id: props.user.id,
    },
  });

  // If there is no session or it's already expired, treat as idempotent/logout OK
  if (!session || session.expired_at !== null) {
    return {};
  }

  // Invalidate the session: set expired_at to now
  await MyGlobal.prisma.todo_list_user_sessions.update({
    where: { id: props.user.session_id },
    data: { expired_at: now },
  });

  return {};
}
