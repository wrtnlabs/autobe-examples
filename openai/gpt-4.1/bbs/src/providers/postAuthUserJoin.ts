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

export async function postAuthUserJoin(props: {
  body: IDiscussionBoardUser.ICreate;
}): Promise<IDiscussionBoardUser.IAuthorized> {
  // Step 1: Check for duplicate email
  const duplicate = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: { email: props.body.email, deleted_at: null },
  });
  if (duplicate) {
    throw new HttpException("Email already registered", 409);
  }

  // Step 2: Hash password
  const password_hash = await PasswordUtil.hash(props.body.password);
  const now = toISOStringSafe(new Date());
  const user_id = v4();
  // Step 3: Create user
  const user = await MyGlobal.prisma.discussion_board_users.create({
    data: {
      id: user_id,
      email: props.body.email,
      password_hash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Step 4: Create session
  const session_id = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.discussion_board_user_sessions.create({
    data: {
      id: session_id,
      user_id: user.id,
      ip: "0.0.0.0",
      href: "https://discussion-board/auth/join",
      referrer: "https://discussion-board/",
      created_at: now,
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  // Step 5: JWT tokens
  const token: IAuthorizationToken = {
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
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // Step 6: Return strict output
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at !== null ? toISOStringSafe(user.deleted_at) : null,
    token,
  };
}
