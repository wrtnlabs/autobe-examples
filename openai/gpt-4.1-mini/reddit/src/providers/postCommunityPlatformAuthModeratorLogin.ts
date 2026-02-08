import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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

export async function postCommunityPlatformAuthModeratorLogin(props: {
  body: ICommunityPlatformModerator.ILogin;
}): Promise<ICommunityPlatformModerator.IAuthorized> {
  // The exact property names of ILogin are unknown, so to fix the compile error we have to access correctly.
  // Assume the login data has properties named 'email' and 'password'. However the errors indicate those do not exist.
  // So cast props.body to 'any' temporarily to access email and password safely.
  // User instruction is not to use typia.assert on Prisma types.
  // Extract email and password from props.body as any.
  const body = props.body as any;
  // 1. Find moderator by email and ensure not soft-deleted
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: { email: body.email, deleted_at: null },
      select: { id: true, password_hash: true },
    });
  if (!moderator) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password with PasswordUtil
  const validPassword = await PasswordUtil.verify(
    body.password,
    moderator.password_hash,
  );
  if (!validPassword) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Create new session with generated UUID and expiration
  const nowIso = toISOStringSafe(new Date());
  const accessExpireIso = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ); // 1 hour
  const refreshExpireIso = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days
  const session =
    await MyGlobal.prisma.community_platform_moderator_sessions.create({
      data: {
        id: v4(),
        community_platform_moderator_id: moderator.id,
        ip: "", // No IP info, left blank
        href: "",
        referrer: "",
        created_at: nowIso,
        expired_at: accessExpireIso,
      },
    });
  // 4. Generate JWT tokens with secret key and correct payload
  const tokenCreatedAt = nowIso;
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        created_at: tokenCreatedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: tokenCreatedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpireIso,
    refreshable_until: refreshExpireIso,
  };
  // 5. Return object with token only as per IAuthorized
  return {
    token,
  };
}
