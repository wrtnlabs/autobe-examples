import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserEmailVerification";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoUserAuthUsersVerifyEmail(props: {
  user: UserPayload;
  body: ITodoUserEmailVerification.IVerify;
}): Promise<void> {
  const token = (props.body as any).token;
  if (!token) {
    throw new HttpException("Token is required", 400);
  }
  const verification =
    await MyGlobal.prisma.todo_user_email_verifications.findUnique({
      where: {
        token,
        deleted_at: null,
      },
    });
  if (!verification) {
    throw new HttpException("Invalid token", 400);
  }
  const now = new Date();
  const tokenCreation = new Date(verification.created_at);
  const minutesSinceCreation =
    (now.getTime() - tokenCreation.getTime()) / (1000 * 60);
  if (minutesSinceCreation > 15) {
    throw new HttpException("Token expired", 401);
  }
  if (verification.verified_at) {
    throw new HttpException("Token already verified", 400);
  }
  if (verification.todo_user_id !== props.user.id) {
    throw new HttpException("Token does not belong to this user", 403);
  }
  await MyGlobal.prisma.todo_user_email_verifications.update({
    where: { id: verification.id },
    data: {
      verified_at: toISOStringSafe(now),
    },
  });
  await MyGlobal.prisma.todo_users.update({
    where: { id: props.user.id },
    data: {
      email_verified: true,
    },
  });
}
