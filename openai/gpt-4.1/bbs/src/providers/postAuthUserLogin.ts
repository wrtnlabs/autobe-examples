import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserLogin(props: {
  body: IDiscussionBoardUser.ILogin;
}): Promise<IDiscussionBoardUser.IAuthorized> {
  // 1. Fetch user by email
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: { email: props.body.email },
  });
  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 2. Only allow login if not locked and not soft-deleted
  if (user.is_locked || user.deleted_at !== null) {
    throw new HttpException("Account locked or deleted", 403);
  }

  // 3. Verify password
  const ok = await PasswordUtil.verify(props.body.password, user.password_hash);
  if (!ok) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 4. Create a new session
  const now = toISOStringSafe(new Date());
  const accessExpire = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpire = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.discussion_board_user_sessions.create({
    data: {
      id: v4(),
      discussion_board_user_id: user.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpire,
    },
  });

  // 5. Create JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        created_at: now,
        tokenType: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpire,
    refreshable_until: refreshExpire,
  };

  // 6. Return authorized context
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    avatar_url: user.avatar_url ?? null,
    is_locked: user.is_locked,
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    token,
  };
}
