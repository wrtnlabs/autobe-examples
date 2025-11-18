import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserLogin(props: {
  body: ITodoUser.ILogin;
}): Promise<ITodoUser.IAuthorized> {
  const { email, password, ip, href, referrer } = props.body;
  // 1. Find active user (by email, not deleted)
  const user = await MyGlobal.prisma.todo_user.findFirst({
    where: {
      email: email,
      deleted_at: null,
    },
  });
  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 2. Verify password
  const valid = await PasswordUtil.verify(password, user.password_hash);
  if (!valid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 3. Create session (30 days expiry)
  const now = new Date();
  const sessionId = v4();
  const accessExpires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sessionData: any = {
    id: sessionId,
    todo_user_id: user.id,
    href,
    referrer,
    created_at: toISOStringSafe(now),
    expired_at: toISOStringSafe(accessExpires),
  };
  if (typeof ip === "string") sessionData.ip = ip satisfies string as string;
  const session = await MyGlobal.prisma.todo_user_sessions.create({
    data: sessionData,
  });

  // 4. Issue JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "30d",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "30d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(accessExpires),
  };

  // 5. Return ITodoUser.IAuthorized
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null ? undefined : toISOStringSafe(user.deleted_at),
    token,
  };
}
