import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAuthUserJoin(props: {
  body: IDiscussionBoardUser.IJoin;
}): Promise<IDiscussionBoardUser.IAuthorized> {
  // Check for existing user
  const existing = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  const now = new Date().toISOString();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const verificationExpires = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString();
  // Create user
  const userId = v4() as string & tags.Format<"uuid">;
  const user = await MyGlobal.prisma.discussion_board_users.create({
    data: {
      id: userId,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.display_name,
      bio: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Create session
  const sessionId = v4() as string & tags.Format<"uuid">;
  const session = await MyGlobal.prisma.discussion_board_user_sessions.create({
    data: {
      id: sessionId,
      discussion_board_user_id: user.id,
      access_token: v4(),
      refresh_token: v4(),
      ip: "unknown",
      user_agent: "unknown",
      referrer: null,
      created_at: now,
      expired_at: accessExpires,
      last_accessed_at: now,
    },
  });
  // Create email verification
  await MyGlobal.prisma.discussion_board_user_email_verifications.create({
    data: {
      id: v4(),
      discussion_board_user_id: user.id,
      token: v4(),
      expires_at: verificationExpires,
      verified_at: null,
      created_at: now,
      updated_at: now,
    },
  });
  // Generate JWT tokens
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
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    bio: user.bio,
    created_at: user.created_at.toISOString(),
    updated_at: user.updated_at.toISOString(),
    deleted_at: user.deleted_at === null ? null : user.deleted_at.toISOString(),
    token,
  } satisfies IDiscussionBoardUser.IAuthorized;
}
