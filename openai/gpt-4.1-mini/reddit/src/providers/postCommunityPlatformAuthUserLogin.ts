import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
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

export async function postCommunityPlatformAuthUserLogin(props: {
  ip: string;
  body: ICommunityPlatformUser.ILogin;
}): Promise<ICommunityPlatformUser.IAuthorized> {
  // 1. Find user by email including password_hash
  const user = await MyGlobal.prisma.community_platform_users.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      karma: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password with PasswordUtil
  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Calculate ISO 8601 string timestamps for created_at and expires
  const now = new Date();
  const created_at = toISOStringSafe(now) as string & tags.Format<"date-time">;
  // Calculate expired_at - 1 hour from now
  const expiredAt = new Date(Date.now() + 60 * 60 * 1000);
  const expired_at = toISOStringSafe(expiredAt) as string &
    tags.Format<"date-time">;
  // Calculate refreshable_until - 7 days from now
  const refreshableUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const refreshable_until = toISOStringSafe(refreshableUntil) as string &
    tags.Format<"date-time">;
  // 4. Create new session record
  const sessionId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.community_platform_user_sessions.create({
    data: {
      id: sessionId,
      user_id: user.id,
      created_at: created_at,
      expired_at: expired_at,
      ip: props.ip,
      href: "",
      referrer: "",
    },
  });
  // 5. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: sessionId,
        created_at: created_at,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: created_at,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: expired_at,
    refreshable_until: refreshable_until,
  };
  // 6. Return IAuthorized object
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    display_name: user.display_name,
    bio: user.bio ?? null,
    avatar_url: user.avatar_url ?? null,
    karma: user.karma,
    created_at: toISOStringSafe(user.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(user.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: user.deleted_at
      ? (toISOStringSafe(user.deleted_at) as string & tags.Format<"date-time">)
      : null,
    token: token,
  };
}
