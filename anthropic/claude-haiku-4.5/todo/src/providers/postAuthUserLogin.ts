import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserLogin(props: {
  body: ITodoAppUser.ILogin;
}): Promise<ITodoAppUser.IAuthorized> {
  // Phase 1: Find user by email
  const user = await MyGlobal.prisma.todo_app_user.findFirst({
    where: {
      email: props.body.email,
    },
  });

  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Phase 2: Verify password
  const isPasswordValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );

  if (!isPasswordValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Phase 3: Create new session record
  const now = new Date();
  const accessExpiryDate = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const session = await MyGlobal.prisma.todo_app_user_session.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: user.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: null,
    },
  });

  // Phase 4: Generate JWT tokens
  const tokenCreatedAt: string & tags.Format<"date-time"> =
    toISOStringSafe(now);

  const accessToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Phase 5: Return authorized user with tokens
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
    last_active_at: user.last_active_at
      ? toISOStringSafe(user.last_active_at)
      : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpiryDate),
      refreshable_until: toISOStringSafe(refreshExpiryDate),
    },
  };
}
