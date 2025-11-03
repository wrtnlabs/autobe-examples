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
  // Check for duplicate email
  const existing = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password
  const hashed = await PasswordUtil.hash(props.body.password);
  const now = toISOStringSafe(new Date());

  // Create user
  const user = await MyGlobal.prisma.discussion_board_users.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: hashed,
      display_name: props.body.display_name,
      avatar_url: props.body.avatar_url ?? null,
      is_locked: false,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    },
  });

  // Create session
  const sessionId = v4();
  const expireAccess = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const expireRefresh = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.discussion_board_user_sessions.create({
    data: {
      id: sessionId,
      discussion_board_user_id: user.id,
      ip: "",
      href: "",
      referrer: "",
      created_at: now,
      expired_at: expireAccess,
    },
  });

  const token = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
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
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: expireAccess,
    refreshable_until: expireRefresh,
  };

  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    avatar_url: user.avatar_url === null ? undefined : user.avatar_url,
    is_locked: user.is_locked,
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    token,
  };
}
