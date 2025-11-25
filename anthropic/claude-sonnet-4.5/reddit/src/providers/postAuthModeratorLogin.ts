import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorLogin(props: {
  body: IRedditCommunityCommunityModerator.ILogin;
}): Promise<IRedditCommunityCommunityModerator.IAuthorized> {
  // Phase 1: Validate moderator credentials
  const moderator = await MyGlobal.prisma.reddit_community_moderators.findFirst(
    {
      where: { email: props.body.email },
    },
  );

  if (!moderator) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Verify password using PasswordUtil
  const isValidPassword = await PasswordUtil.verify(
    props.body.password,
    moderator.password_hash,
  );

  if (!isValidPassword) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Phase 2: Create new session record
  const now = new Date().toISOString();
  const accessExpiresMs = Date.now() + 60 * 60 * 1000; // 1 hour from now
  const refreshExpiresMs = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now

  const session =
    await MyGlobal.prisma.reddit_community_moderator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_community_moderator_id: moderator.id,
        ip: props.body.ip ?? "unknown",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: null,
      },
    });

  // Phase 3: Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
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
        type: "moderator",
        id: moderator.id,
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
    expired_at: new Date(accessExpiresMs).toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: new Date(refreshExpiresMs).toISOString() as string &
      tags.Format<"date-time">,
  };

  // Return complete moderator profile with tokens
  return {
    id: moderator.id,
    username: moderator.username,
    email: moderator.email,
    nickname: moderator.display_name ?? moderator.username,
    created_at: toISOStringSafe(moderator.created_at),
    token,
  };
}
