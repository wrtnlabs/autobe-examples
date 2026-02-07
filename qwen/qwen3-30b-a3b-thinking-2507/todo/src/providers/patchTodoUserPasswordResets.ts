import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe"

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserPasswordReset";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload"

export async function patchTodoUserPasswordResets(props: {}, n, user: UserPayload, n, body: ITodoUserPasswordReset.IRequest, n): Promise<ITodoUser.ISummary> { n; const resetToken = await MyGlobal.prisma.todo_user_password_resets.findFirst({ n, where: { n, token: props.body.token, n, expires_at: { gte: toISOStringSafe(new Date()) }, n }, n }); n; if (!resetToken) {
    n;
    throw new HttpException("Invalid or expired token", 400);
  }
  await MyGlobal.prisma.todo_users.update({
    where: { id: resetToken.todo_user_id },
    data: {
      password_hash: await PasswordUtil.hash(props.body.password),
    },
  });
  const now = new Date();
  await MyGlobal.prisma.todo_user_sessions.updateMany({
    where: { user_id: resetToken.todo_user_id, deleted_at: null },
    data: {
      deleted_at: toISOStringSafe(now),
    },
  });
  await MyGlobal.prisma.todo_user_password_resets.delete({
    where: { id: resetToken.id },
  });
  const user = await MyGlobal.prisma.todo_users.findUnique({
    where: { id: resetToken.todo_user_id },
    select: { id: true },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  return { id: user.id };
});
} }
