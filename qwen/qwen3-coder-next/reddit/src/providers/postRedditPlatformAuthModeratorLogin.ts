import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAuthModeratorLogin(props: {
  body: IRedditPlatformModerator.ILogin;
}): Promise<IRedditPlatformModerator.IAuthorized> {
  // Find moderator
  const moderator = await MyGlobal.prisma.reddit_platform_moderators.findFirst({
    where: { status: "active" },
    select: {
      id: true,
      user_id: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      karma_score: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!moderator) throw new HttpException("Invalid credentials", 401);
  // Create new session
  const accessExpires = new Date(Date.now() + 30 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.reddit_platform_moderator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_platform_moderator_id: moderator.id,
        access_token: "",
        refresh_token: "",
        refresh_expires_at: toISOStringSafe(refreshExpires),
        updated_at: toISOStringSafe(new Date()),
        ip: "0.0.0.0",
        href: "/redditPlatform/auth/moderator/login",
        referrer: "",
        created_at: toISOStringSafe(new Date()),
        expires_at: toISOStringSafe(accessExpires),
      },
    });
  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires) as string &
      tags.Format<"date-time">,
    refreshable_until: toISOStringSafe(refreshExpires) as string &
      tags.Format<"date-time">,
  };
  return {
    token,
  } satisfies IRedditPlatformModerator.IAuthorized;
}
