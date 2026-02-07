import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAuthUserJoin(props: {
  body: IRedditPlatformUser.IJoin;
}): Promise<IRedditPlatformUser.IAuthorized> {
  // Create minimal user with system-generated values
  const user = await MyGlobal.prisma.reddit_platform_users.create({
    data: {
      id: v4(),
      email: "system-generated@example.com",
      username: `user_${v4().substring(0, 8)}`,
      password_hash: await PasswordUtil.hash(`pass_${v4()}`),
      karma_score: 0,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Create session with correct relation field name
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_platform_user_sessions.create({
    data: {
      id: v4(),
      reddit_platform_user_id: user.id,
      access_token: `access_${v4()}`,
      refresh_token: `refresh_${v4()}`,
      access_token_expires_at: toISOStringSafe(accessExpires),
      refresh_token_expires_at: toISOStringSafe(refreshExpires),
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
      last_activity_at: toISOStringSafe(new Date()),
      is_active: true,
    },
  });
  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
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
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // Return authorized response
  return {
    token,
  } satisfies IRedditPlatformUser.IAuthorized;
}
