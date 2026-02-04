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
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postTodoAuthUserJoin(props: {
  body: ITodoUser.IJoin;
}): Promise<ITodoUser.IAuthorized> {
  const { email, password = props.body };
  const existingUser = await MyGlobal.prisma.todo_users.findFirst({
    where: { email: email },
  });
  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }
  const user = await MyGlobal.prisma.todo_users.create({
    data: {
      id: v4(),
      email: email,
      password_hash: await PasswordUtil.hash(password),
      created_at: toISOStringSafe(new Date()),
    },
  });
  const verificationToken = v4();
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.todo_user_email_verifications.create({
    data: {
      id: v4(),
      user: {
        connect: {
          id: user.id,
        },
      },
      token: verificationToken,
      expired_at: toISOStringSafe(verificationExpires),
      created_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: user.id,
    email: user.email,
    displayName: "New User",
    createdAt: toISOStringSafe(new Date()),
    token: {
      access: "email-verification-token:" + verificationToken,
      refresh: "email-verification-token:" + verificationToken,
      expired_at: toISOStringSafe(verificationExpires),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 24 * 60 * 60 * 1000),
      ),
    },
  };
}
