import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoListUserUsersLogout(props: {
  user: UserPayload;
}): Promise<void> {
  const { user } = props;

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.todo_list_user_sessions.update({
    where: { id: user.session_id },
    data: {
      expired_at: now,
    },
  });
}
