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

export async function postAuthUserJoin(props: {
  body: IDiscussionBoardUser.ICreate;
}): Promise<IDiscussionBoardUser.IAuthorized> {
  // 1. Check for unique email
  const found = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (found) {
    throw new HttpException("Email already registered", 409);
  }

  // 2. Hash password with PasswordUtil
  const password_hash = await PasswordUtil.hash(props.body.password);
  const now = toISOStringSafe(new Date());
  const userId = v4();

  // 3. Insert into discussion_board_users
  const user = await MyGlobal.prisma.discussion_board_users.create({
    data: {
      id: userId,
      email: props.body.email,
      password_hash,
      is_email_verified: false,
      is_active: true,
      is_blocked: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 4. Create session (ip must be string)
  const sessionId = v4();
  const accessExpireDate = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpireDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.discussion_board_user_sessions.create({
    data: {
      id: sessionId,
      discussion_board_user_id: user.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: toISOStringSafe(accessExpireDate),
    },
  });

  // 5. Generate tokens
  const access = jwt.sign(
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
  );
  const refresh = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // 6. Assemble API output: strict null/undefined for deleted_at
  return {
    id: user.id,
    email: user.email,
    is_email_verified: user.is_email_verified,
    is_active: user.is_active,
    is_blocked: user.is_blocked,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null || user.deleted_at === undefined
        ? null
        : toISOStringSafe(user.deleted_at),
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessExpireDate),
      refreshable_until: toISOStringSafe(refreshExpireDate),
    },
  };
}
