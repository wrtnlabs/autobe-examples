import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";

export async function postAuthUserLogin(props: {
  body: ICommunityForumCommunityUser.ILogin;
}): Promise<ICommunityForumCommunityUser.IAuthorized> {
  // 1. Find user by email
  const user = await MyGlobal.prisma.community_forum_users.findFirst({
    where: {
      email: props.body.email,
    },
  });

  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 3. Create new session
  const accessExpires: Date = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await MyGlobal.prisma.community_forum_user_sessions.create({
    data: {
      id: v4(),
      community_forum_user_id: user.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date().toISOString(),
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // 4. Generate JWT tokens
  const token: ICommunityForumAuthorizationToken = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
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
        created_at: new Date().toISOString(),
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

  // 5. Return authorized user
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    created_at: toISOStringSafe(user.created_at),
    updated_at: user.updated_at ? toISOStringSafe(user.updated_at) : undefined,
    token,
  };
}
