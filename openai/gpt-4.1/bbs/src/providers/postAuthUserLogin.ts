import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  // 1. Find user by email
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: { email: props.body.email },
  });
  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 2. Verify password using PasswordUtil
  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 3. Compute expiration timestamps as string & tags.Format<'date-time'> only
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nowISOString = toISOStringSafe(now);
  const accessExpiredISOString = toISOStringSafe(accessExpires);
  const refreshExpiredISOString = toISOStringSafe(refreshExpires);

  // 4. Create a new session record (discussion_board_user_sessions)
  const session = await MyGlobal.prisma.discussion_board_user_sessions.create({
    data: {
      id: v4(),
      user_id: user.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: nowISOString,
      expired_at: accessExpiredISOString,
    },
  });

  // 5. Generate JWT access and refresh tokens per requirements
  const accessToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      created_at: nowISOString,
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
      created_at: nowISOString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // 6. Prepare output with correct DTO contract, handle null vs undefined
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredISOString,
      refreshable_until: refreshExpiredISOString,
    },
  };
}
