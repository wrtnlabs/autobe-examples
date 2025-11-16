import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";

export async function postAuthUserLogin(props: {
  body: IDiscussionBoardUser.ILoginRequest;
}): Promise<IDiscussionBoardUser.IAuthorized> {
  // 1. Find the user by email, who is active, not blocked, and not deleted
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      email: props.body.email,
      is_active: true,
      is_blocked: false,
      deleted_at: null,
    },
  });
  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 2. Validate password using PasswordUtil
  const passwordValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!passwordValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 3. Create new session
  const sessionId = v4();
  const now = new Date();
  const accessExpire = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpire = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.discussion_board_user_sessions.create({
    data: {
      id: sessionId,
      discussion_board_user_id: user.id,
      ip: "",
      href: "",
      referrer: "",
      created_at: toISOStringSafe(now),
      expired_at: toISOStringSafe(accessExpire),
    },
  });

  // 4. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: sessionId,
        created_at: toISOStringSafe(now),
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
        session_id: sessionId,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpire),
    refreshable_until: toISOStringSafe(refreshExpire),
  };

  // 5. Prepare deleted_at (nullable)
  const deletedAt =
    user.deleted_at === null ? null : toISOStringSafe(user.deleted_at);

  // 6. Return user profile & token
  return {
    id: user.id,
    email: user.email,
    is_email_verified: user.is_email_verified,
    is_active: user.is_active,
    is_blocked: user.is_blocked,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: deletedAt,
    token,
  };
}
